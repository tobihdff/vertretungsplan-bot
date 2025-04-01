const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PLAN_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, cache, DEBUG, BASE_URL, GENERAL_CHANGE_THRESHOLD } = require('../config');
const { getTargetDate, formatDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchData, ERROR_THRESHOLD } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');
const { updateBotStatus } = require('../utils/statusUtils');
const { debugLog } = require('../utils/debugUtils');
const crypto = require('crypto');

/**
 * Erzeugt einen Hash für die Änderungen zur Erkennung identischer Daten
 * @param {object} data - Die Daten, aus denen ein Hash generiert werden soll
 * @returns {string} Hash-String der Daten
 */
function createDataHash(data) {
    if (!data) return '';
    const jsonString = JSON.stringify(data);
    return crypto.createHash('md5').update(jsonString).digest('hex');
}

/**
 * Sendet eine Ping-Benachrichtigung, die nach 5 Sekunden gelöscht wird
 */
async function sendTempPingNotification(channel, roleId, message) {
    if (!roleId) return;
    
    try {
        debugLog(`Sende temporäre Ping-Nachricht an Rolle ${roleId}: "${message}"`);
        const pingMsg = await channel.send(`<@&${roleId}> ${message}`);
        
        // Nach 5 Sekunden wieder löschen
        setTimeout(async () => {
            try {
                debugLog('Lösche temporäre Ping-Nachricht');
                await pingMsg.delete();
            } catch (err) {
                console.error('Fehler beim Löschen der Ping-Nachricht:', err);
                debugLog(`Fehler beim Löschen der Ping-Nachricht: ${err.message}`);
            }
        }, 5000);
    } catch (err) {
        console.error('Fehler beim Senden der Ping-Nachricht:', err);
        debugLog(`Fehler beim Senden der Ping-Nachricht: ${err.message}`);
    }
}

/**
 * Überprüft auf Änderungen im Vertretungsplan ohne eine neue Nachricht zu senden
 */
async function checkPlanChanges(client) {
    try {
        debugLog('Starte Überprüfung auf Änderungen im Vertretungsplan');
        
        // API immer als verfügbar betrachten
        cache.apiAvailable = true;
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Änderungsprüfung: ${dateParam}`);
        
        // Daten abrufen mit erweiterten Retry-Mechanismen
        let data;
        let retryCount = 0;
        const maxRetries = 2; // Maximal 2 Versuche bei kurzzeitigen Fehlern
        
        while (retryCount <= maxRetries) {
            try {
                data = await fetchData(dateParam);
                
                // Erfolgreicher Abruf, Schleife verlassen
                break;
            } catch (err) {
                retryCount++;
                debugLog(`Versuch ${retryCount}/${maxRetries+1} fehlgeschlagen: ${err.message}`);
                
                if (retryCount <= maxRetries) {
                    // Kurze Pause vor dem nächsten Versuch
                    debugLog(`Warte 2 Sekunden vor erneutem Versuch...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // Alle Versuche fehlgeschlagen
                    debugLog(`Alle ${maxRetries+1} Versuche fehlgeschlagen, breche ab`);
                    return;
                }
            }
        }
        
        // Wenn die API ein leeres Array zurückgibt, keine Aktualisierung durchführen
        if (!data || data.length === 0) {
            debugLog(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            return;
        }
        
        // Benachrichtigungs-Channel holen
        const notificationChannel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!notificationChannel) {
            debugLog(`Benachrichtigungs-Channel nicht gefunden! ID: ${NOTIFICATION_CHANNEL_ID}`);
            console.error('Benachrichtigungs-Channel nicht gefunden!');
            return;
        }
        
        // Überprüfen, ob sich die Daten geändert haben
        debugLog('Prüfe auf Änderungen in den Daten');
        const lastData = cache.data[dateParam];
        const dataChanged = hasDataChanged(lastData, data);
        
        // Wenn sich die Daten geändert haben und es vorherige Daten gibt
        if (dataChanged && lastData) {
            debugLog('Änderungen in den Daten erkannt');
            const targetDateStr = formatReadableDate(targetDate);
            
            // Spezifische Änderungen identifizieren
            debugLog('Identifiziere spezifische Änderungen');
            const { newSubstitutions, newCancellations } = findChanges(lastData, data);
            
            debugLog(`Gefundene Änderungen: ${newSubstitutions.length} neue Vertretungen, ${newCancellations.length} neue Entfälle`);
            
            // Prüfen, ob es spezifische Änderungen gibt
            const hasSpecificChanges = newSubstitutions.length > 0 || newCancellations.length > 0;
            
            // Bei spezifischen Änderungen (Vertretungen/Entfälle): Sofort Benachrichtigung senden
            if (hasSpecificChanges) {
                // Daten im Cache speichern und Änderungszähler zurücksetzen
                cache.data[dateParam] = data;
                cache.generalChanges[dateParam] = 0;
                cache.generalChangesHash[dateParam] = '';
                
                // Erstelle lesbare Strings für die Änderungen
                let substitutionText = '';
                let cancellationText = '';
                
                if (newSubstitutions.length > 0) {
                    substitutionText = newSubstitutions.map(item => {
                        const originalTeacher = item.originalLehrkraft || item.Lehrkraft;
                        return `• **${item.Stunde}. Std ${item.Fach}**: ${originalTeacher} → **${item.Lehrkraft}** (Raum ${item.Raum})`;
                    }).join('\n');
                }
                
                if (newCancellations.length > 0) {
                    cancellationText = newCancellations.map(item => {
                        return `• **${item.Stunde}. Std ${item.Fach}**: Unterricht bei ${item.Lehrkraft} entfällt`;
                    }).join('\n');
                }
                
                // Embed für die Aktualisierungsnachricht erstellen
                debugLog('Erstelle Embed für Aktualisierungsnachricht');
                const updateEmbed = new EmbedBuilder()
                    .setColor('#FFA500') // Orange Farbe für Aufmerksamkeit
                    .setTitle('📝 Vertretungsplan aktualisiert')
                    .setDescription(`Der Vertretungsplan für **${targetDateStr}** wurde aktualisiert.`)
                    .setTimestamp()
                    .setFooter({ text: 'WITA24 Vertretungsplan-Bot' });
                
                // Standardfelder hinzufügen
                updateEmbed.addFields(
                    { name: 'Stand', value: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr' }
                );
                
                // Spezifische Änderungen als Felder hinzufügen
                if (substitutionText) {
                    updateEmbed.addFields({ 
                        name: '🔄 Neue Vertretungen', 
                        value: substitutionText 
                    });
                }
                
                if (cancellationText) {
                    updateEmbed.addFields({ 
                        name: '❌ Unterrichtsentfall', 
                        value: cancellationText 
                    });
                }
                
                // Debug-Informationen hinzufügen, wenn der Debug-Modus aktiv ist
                if (DEBUG) {
                    debugLog('Füge Debug-Informationen zum Embed hinzu');
                    updateEmbed.addFields({ 
                        name: '🔍 DEBUG: Änderungsdetails', 
                        value: `Zeitstempel: ${new Date().toISOString()}\nÄnderungen erkannt: Ja\nNeue Vertretungen: ${newSubstitutions.length}\nNeue Entfälle: ${newCancellations.length}` 
                    });
                }
                    
                // Embed senden ohne Rollenerwähnung
                debugLog('Sende Aktualisierungs-Embed für spezifische Änderungen');
                await notificationChannel.send({ embeds: [updateEmbed] });
                
                // Separate Ping-Nachricht senden, die nach 5 Sekunden gelöscht wird
                if (UPDATE_ROLE_ID) {
                    debugLog(`Sende temporäre Ping-Nachricht an Rolle ${UPDATE_ROLE_ID}`);
                    await sendTempPingNotification(
                        notificationChannel, 
                        UPDATE_ROLE_ID, 
                        'Der Vertretungsplan wurde aktualisiert!'
                    );
                }
                
                console.log(`Spezifische Änderungen im Vertretungsplan erkannt: ${new Date().toLocaleString()}`);
            } 
            // Bei allgemeinen Änderungen: Zähler erhöhen und ggf. nach 3-maligem Auftreten aktualisieren
            else {
                // Erzeugen eines Hashes der neuen Daten für Vergleiche
                const dataHash = createDataHash(data);
                const lastHash = cache.generalChangesHash[dateParam];
                
                // Prüfe, ob der Hash der aktuellen Änderung mit dem letzten übereinstimmt
                if (dataHash === lastHash) {
                    // Gleiche Änderung wie zuvor - erhöhe Zähler
                    cache.generalChanges[dateParam] = (cache.generalChanges[dateParam] || 0) + 1;
                    debugLog(`Gleiche allgemeine Änderung erkannt - Zähler: ${cache.generalChanges[dateParam]}/${GENERAL_CHANGE_THRESHOLD}`);
                    
                    // Bei Erreichen des Schwellwerts Daten aktualisieren
                    if (cache.generalChanges[dateParam] >= GENERAL_CHANGE_THRESHOLD) {
                        debugLog(`Schwellwert für allgemeine Änderungen erreicht (${GENERAL_CHANGE_THRESHOLD}x) - Aktualisiere Daten`);
                        cache.data[dateParam] = data;
                        cache.generalChanges[dateParam] = 0;
                        
                        // Debug-Log für Konsole
                        console.log(`Allgemeine Änderungen im Vertretungsplan ${GENERAL_CHANGE_THRESHOLD}x bestätigt - Aktualisiert: ${new Date().toLocaleString()}`);
                    } else {
                        debugLog(`Allgemeine Änderung erkannt, aber Schwellwert noch nicht erreicht (${cache.generalChanges[dateParam]}/${GENERAL_CHANGE_THRESHOLD}) - Keine Aktualisierung`);
                    }
                } else {
                    // Neue allgemeine Änderung - setze Zähler auf 1 und speichere Hash
                    cache.generalChanges[dateParam] = 1;
                    cache.generalChangesHash[dateParam] = dataHash;
                    debugLog(`Neue allgemeine Änderung erkannt - Zähler auf 1 gesetzt, neuer Hash gespeichert: ${dataHash.substring(0, 8)}...`);
                }
                
                // Bei allgemeinen Änderungen KEINE Benachrichtigung senden - aber im Debug-Log vermerken
                debugLog('Allgemeine Änderungen werden nicht benachrichtigt');
            }
        } else if (dataChanged) {
            // Initialzustand - speichern ohne zu benachrichtigen
            debugLog('Initialzustand: Speichere Daten ohne Benachrichtigung');
            cache.data[dateParam] = data;
            cache.generalChanges[dateParam] = 0;
            cache.generalChangesHash[dateParam] = '';
            console.log(`Initiale Daten gespeichert für ${dateParam}: ${new Date().toLocaleString()}`);
        } else {
            debugLog('Keine Änderungen im Vertretungsplan erkannt');
            console.log(`Keine Änderungen im Vertretungsplan für ${dateParam}: ${new Date().toLocaleString()}`);
        }
        
        // Letzten Prüfzeitpunkt speichern
        cache.lastCheck = new Date();
        debugLog(`Prüfung abgeschlossen: ${cache.lastCheck.toISOString()}`);
        
    } catch (err) {
        console.error('Fehler beim Überprüfen auf Änderungen:', err);
        debugLog(`Fehler bei der Änderungsprüfung: ${err.message}`);
    }
}

/**
 * Löscht ältere Vertretungsplan-Nachrichten im Channel
 */
async function cleanupOldMessages(channel) {
    try {
        debugLog('Starte Bereinigung älterer Vertretungsplan-Nachrichten');
        
        // Hole die letzten 50 Nachrichten (wäre ausreichend für mehrere Wochen)
        const messages = await channel.messages.fetch({ limit: 50 });
        
        // Alle aktuellen Nachrichten-IDs aus dem Cache holen
        const currentMessageIds = Object.values(cache.messages);
        debugLog(`Aktuelle Nachrichten-IDs im Cache: ${currentMessageIds.length}`);
        
        // Filtere Nachrichten, die vom Bot stammen und Vertretungspläne enthalten
        // aber KEINE der aktuellen Nachrichten sind
        const oldPlanMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes('**Vertretungsplan für') &&
            !currentMessageIds.includes(msg.id)
        );
        
        // Nur Nachrichten anzeigen, die gelöscht werden
        if (oldPlanMessages.size > 0) {
            debugLog(`${oldPlanMessages.size} ältere Vertretungsplan-Nachrichten gefunden`);
            
            // Lösche die Nachrichten einzeln, da sie möglicherweise älter als 14 Tage sind
            for (const [id, message] of oldPlanMessages) {
                try {
                    await message.delete();
                    debugLog(`Alte Nachricht gelöscht: ${id}`);
                } catch (err) {
                    debugLog(`Fehler beim Löschen einer alten Nachricht: ${err.message}`);
                    // Wir ignorieren Fehler beim Löschen alter Nachrichten
                }
            }
            
            console.log(`${oldPlanMessages.size} ältere Vertretungsplan-Nachrichten wurden gelöscht`);
        } else {
            debugLog('Keine älteren Vertretungsplan-Nachrichten zum Löschen gefunden');
        }
    } catch (err) {
        console.error('Fehler beim Bereinigen älterer Nachrichten:', err);
        debugLog(`Fehler bei der Bereinigung älterer Nachrichten: ${err.message}`);
    }
}

/**
 * Aktualisiert den Vertretungsplan vollständig (Bild und ggf. Benachrichtigung)
 */
async function updatePlan(client) {
    try {
        debugLog('Starte vollständige Aktualisierung des Vertretungsplans');
        
        // Status-Überprüfung deaktiviert
        // await updateBotStatus(client);
        
        // API immer als verfügbar betrachten
        cache.apiAvailable = true;
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Planaktualisierung: ${dateParam}`);
        
        // Daten abrufen mit Retry-Mechanismus
        let data;
        let retryCount = 0;
        const maxRetries = 2; // Maximal 2 Versuche bei kurzzeitigen Fehlern
        
        while (retryCount <= maxRetries) {
            try {
                data = await fetchData(dateParam);
                
                // Erfolgreicher Abruf, Schleife verlassen
                break;
            } catch (err) {
                retryCount++;
                debugLog(`Versuch ${retryCount}/${maxRetries+1} fehlgeschlagen: ${err.message}`);
                
                if (retryCount <= maxRetries) {
                    // Kurze Pause vor dem nächsten Versuch
                    debugLog(`Warte 2 Sekunden vor erneutem Versuch...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    // Alle Versuche fehlgeschlagen
                    debugLog(`Alle ${maxRetries+1} Versuche fehlgeschlagen, breche ab`);
                    return;
                }
            }
        }
        
        // Wenn die API ein leeres Array zurückgibt, keine Aktualisierung durchführen
        if (!data || data.length === 0) {
            debugLog(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            return;
        }
        
        // Plan-Channel holen
        const planChannel = client.channels.cache.get(PLAN_CHANNEL_ID);
        if (!planChannel) {
            debugLog(`Plan-Channel nicht gefunden! ID: ${PLAN_CHANNEL_ID}`);
            console.error('Plan-Channel nicht gefunden!');
            return;
        }
        
        // Prüfen auf Änderungen und ggf. benachrichtigen
        await checkPlanChanges(client);
        
        // Bild erstellen
        debugLog('Erstelle Bild für Vertretungsplan');
        const imageBuffer = await createPlanImage(data, targetDate);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'vertretungsplan.png' });
        
        // Buttons für die Rolle erstellen (falls konfiguriert)
        let components = [];
        if (UPDATE_ROLE_ID) {
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('role_subscribe')
                        .setLabel('Benachrichtigungen erhalten')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('🔔'),
                    new ButtonBuilder()
                        .setCustomId('role_unsubscribe')
                        .setLabel('Keine Benachrichtigungen')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔕')
                );
            components.push(row);
        }
        
        // Neue Nachricht senden oder bestehende aktualisieren
        const targetDateStr = formatReadableDate(targetDate);
        let messageContent = `**Vertretungsplan für ${targetDateStr}**`;
        let existingMessage = null;
        
        // Prüfen, ob bereits eine Nachricht für dieses Datum existiert
        const lastMessageId = cache.messages[dateParam];
        if (lastMessageId) {
            try {
                debugLog(`Versuche bestehende Nachricht mit ID: ${lastMessageId} zu laden`);
                existingMessage = await planChannel.messages.fetch(lastMessageId).catch(() => null);
            } catch (err) {
                debugLog(`Fehler beim Laden der bestehenden Nachricht: ${err.message}`);
                existingMessage = null;
            }
        }
        
        // Debug-Informationen vorbereiten, wenn im Debug-Modus
        let debugEmbed = null;
        if (DEBUG) {
            debugLog('Füge Debug-Informationen zur Nachricht hinzu');
            debugEmbed = new EmbedBuilder()
                .setColor('#808080') // Graue Farbe für Debug-Informationen
                .setTitle('🔍 Debug-Informationen')
                .setDescription('Rohdaten vom API-Aufruf:')
                .addFields(
                    { name: 'API URL', value: `\`${BASE_URL}?date=${dateParam}\`` },
                    { name: 'Anzahl Einträge', value: `${data.length}` },
                    { name: 'Zeitstempel', value: new Date().toISOString() }
                );
            
            // Rohdaten in Chunks aufteilen, da Discord Felder auf 1024 Zeichen begrenzt
            const rawDataStr = JSON.stringify(data, null, 2);
            const chunkSize = 1000; // Etwas weniger als 1024 für Formatierung
            
            for (let i = 0; i < rawDataStr.length; i += chunkSize) {
                const chunk = rawDataStr.substring(i, i + chunkSize);
                debugEmbed.addFields({
                    name: i === 0 ? 'Rohdaten' : '... Fortsetzung',
                    value: '```json\n' + chunk + '\n```'
                });
                
                // Maximal 5 Chunks, um Embed-Limits nicht zu überschreiten
                if (i >= chunkSize * 4) {
                    debugEmbed.addFields({
                        name: 'Hinweis',
                        value: 'Die Daten sind zu groß und wurden abgeschnitten.'
                    });
                    break;
                }
            }
        }
        
        // Bestehende Nachricht aktualisieren oder neue erstellen
        if (existingMessage) {
            debugLog('Bestehende Nachricht gefunden, aktualisiere den Anhang');
            
            const editOptions = {
                content: messageContent,
                files: [attachment],
                components: components
            };
            
            // Debug-Embed hinzufügen, falls im Debug-Modus
            if (DEBUG && debugEmbed) {
                editOptions.embeds = [debugEmbed];
            } else if (existingMessage.embeds.length > 0) {
                // Wenn vorher Embeds existierten, aber jetzt deaktiviert sind, leeres Array setzen
                editOptions.embeds = [];
            }
            
            await existingMessage.edit(editOptions);
            debugLog(`Nachricht erfolgreich aktualisiert (ID: ${existingMessage.id})`);
        } else {
            debugLog('Keine bestehende Nachricht gefunden oder Fehler beim Laden, erstelle neue Nachricht');
            
            // Alte Nachrichten bereinigen
            await cleanupOldMessages(planChannel);
            
            // Sende neue Nachricht mit oder ohne Debug-Embed
            const sendOptions = {
                content: messageContent,
                files: [attachment],
                components: components
            };
            
            if (DEBUG && debugEmbed) {
                sendOptions.embeds = [debugEmbed];
            }
            
            const newMessage = await planChannel.send(sendOptions);
            
            // Neue Nachricht-ID speichern
            cache.messages[dateParam] = newMessage.id;
            debugLog(`Neue Nachricht erstellt (ID: ${newMessage.id})`);
        }
        
        console.log(`Vertretungsplan aktualisiert für ${dateParam}: ${new Date().toLocaleString()}`);
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Vertretungsplans:', err);
        debugLog(`Fehler bei der Planaktualisierung: ${err.message}`);
    }
}

module.exports = {
    updatePlan,
    checkPlanChanges,
    sendTempPingNotification,
    cleanupOldMessages  // Neue Funktion exportieren
};
