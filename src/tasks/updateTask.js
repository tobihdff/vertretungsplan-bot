const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PLAN_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, cache, DEBUG, BASE_URL } = require('../config');
const { getTargetDate, formatDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchData } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');
const { updateBotStatus } = require('../utils/statusUtils');
const { debugLog } = require('../utils/debugUtils');

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
        
        // Bot-Status aktualisieren vor API-Abruf
        await updateBotStatus(client);
        
        // Wenn API nicht verfügbar ist, abbrechen
        if (!cache.apiAvailable) {
            debugLog('API ist nicht erreichbar - Überspringe Änderungsprüfung');
            console.log('API ist nicht erreichbar - Überspringe Änderungsprüfung');
            return;
        }
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Änderungsprüfung: ${dateParam}`);
        
        // Daten abrufen
        let data;
        try {
            data = await fetchData(dateParam);
            // API konnte erfolgreich abgerufen werden - setze Status explizit
            if (!cache.apiAvailable) {
                cache.apiAvailable = true;
                cache.statusChanged = true;
                debugLog('API jetzt verfügbar - Setze Status auf verfügbar');
                await updateBotStatus(client);
            }
        } catch (err) {
            debugLog(`Fehler beim Abrufen der Daten: ${err.message}`);
            // Bei Fehler den API-Status auf nicht verfügbar setzen
            cache.apiAvailable = false;
            cache.statusChanged = true;
            await updateBotStatus(client);
            return;
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
            
            // Spezifische Änderungen als Felder hinzufügen, falls vorhanden
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
            
            // Wenn keine spezifischen Änderungen erkannt wurden, einen allgemeinen Hinweis hinzufügen
            if (!substitutionText && !cancellationText) {
                updateEmbed.addFields({ 
                    name: 'ℹ️ Änderungen', 
                    value: 'Es wurden allgemeine Änderungen erkannt. Details sind im Vertretungsplan zu finden.' 
                });
            }
            
            // Debug-Informationen hinzufügen, wenn der Debug-Modus aktiv ist
            if (DEBUG) {
                debugLog('Füge Debug-Informationen zum Embed hinzu');
                updateEmbed.addFields({ 
                    name: '🔍 DEBUG: Rohdaten (alte Daten)', 
                    value: '```json\n' + JSON.stringify(lastData, null, 2).substring(0, 1000) + '...\n```' 
                });
                
                updateEmbed.addFields({ 
                    name: '🔍 DEBUG: Rohdaten (neue Daten)', 
                    value: '```json\n' + JSON.stringify(data, null, 2).substring(0, 1000) + '...\n```' 
                });
                
                // Zusätzliche Debug-Informationen
                updateEmbed.addFields({ 
                    name: '🔍 DEBUG: Änderungsdetails', 
                    value: `Zeitstempel: ${new Date().toISOString()}\nÄnderungen erkannt: Ja\nNeue Vertretungen: ${newSubstitutions.length}\nNeue Entfälle: ${newCancellations.length}` 
                });
            }
                
            // Embed senden ohne Rollenerwähnung
            debugLog('Sende Aktualisierungs-Embed');
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
            
            // Speichere die neuen Daten
            debugLog('Speichere neue Daten im Cache');
            cache.data[dateParam] = data;
            
            console.log(`Änderungen im Vertretungsplan erkannt: ${new Date().toLocaleString()}`);
        } else if (dataChanged) {
            // Initialzustand - speichern ohne zu benachrichtigen
            debugLog('Initialzustand: Speichere Daten ohne Benachrichtigung');
            cache.data[dateParam] = data;
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
        
        // Filtere Nachrichten, die vom Bot stammen und Vertretungspläne enthalten
        const oldPlanMessages = messages.filter(msg => 
            msg.author.id === channel.client.user.id && 
            msg.content.includes('**Vertretungsplan für') &&
            // Vermeidet das Löschen der Message, die gerade neu gesendet wird
            !cache.messages[Object.keys(cache.messages)[0]] || msg.id !== cache.messages[Object.keys(cache.messages)[0]]
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
        
        // Bot-Status aktualisieren vor API-Abruf
        await updateBotStatus(client);
        
        // Wenn API nicht verfügbar ist, abbrechen
        if (!cache.apiAvailable) {
            debugLog('API ist nicht erreichbar - Überspringe Planaktualisierung');
            console.log('API ist nicht erreichbar - Überspringe Planaktualisierung');
            return;
        }
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        debugLog(`Ermittelter Zieldatum für Planaktualisierung: ${dateParam}`);
        
        // Daten abrufen
        let data;
        try {
            data = await fetchData(dateParam);
            // API konnte erfolgreich abgerufen werden - setze Status explizit
            if (!cache.apiAvailable) {
                cache.apiAvailable = true;
                cache.statusChanged = true;
                debugLog('API jetzt verfügbar - Setze Status auf verfügbar');
                await updateBotStatus(client);
            }
        } catch (err) {
            debugLog(`Fehler beim Abrufen der Daten: ${err.message}`);
            // Bei Fehler den API-Status auf nicht verfügbar setzen
            cache.apiAvailable = false;
            cache.statusChanged = true;
            await updateBotStatus(client);
            return;
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
        
        // Alte Nachricht für das aktuelle Datum löschen, falls vorhanden
        const lastMessageId = cache.messages[dateParam];
        if (lastMessageId) {
            try {
                debugLog(`Lösche alte Nachricht mit ID: ${lastMessageId}`);
                const oldMessage = await planChannel.messages.fetch(lastMessageId);
                if (oldMessage) {
                    await oldMessage.delete();
                }
            } catch (err) {
                console.error('Fehler beim Löschen der alten Nachricht:', err);
                debugLog(`Fehler beim Löschen der alten Nachricht: ${err.message}`);
            }
        }
        
        // Alle älteren Vertretungsplan-Nachrichten löschen
        await cleanupOldMessages(planChannel);
        
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
        
        // Neue Nachricht senden
        const targetDateStr = formatReadableDate(targetDate);
        
        let messageContent = `**Vertretungsplan für ${targetDateStr}**`;
        
        // Debug-Informationen hinzufügen, wenn der Debug-Modus aktiv ist
        if (DEBUG) {
            debugLog('Füge Debug-Informationen zur Nachricht hinzu');
            // Debug-Informationen als Embed erstellen, damit die Nachricht besser strukturiert ist
            const debugEmbed = new EmbedBuilder()
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
            
            // Sende das Bild mit dem Debug-Embed
            const newMessage = await planChannel.send({
                content: messageContent,
                files: [attachment],
                embeds: [debugEmbed],
                components: components
            });
            
            // Neue Nachricht-ID speichern
            cache.messages[dateParam] = newMessage.id;
        } else {
            // Normale Nachricht ohne Debug-Informationen
            const newMessage = await planChannel.send({
                content: messageContent,
                files: [attachment],
                components: components
            });
            
            // Neue Nachricht-ID speichern
            cache.messages[dateParam] = newMessage.id;
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
