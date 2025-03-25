const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PLAN_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, cache, DEBUG, BASE_URL } = require('../config');
const { getTargetDate, formatDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchData } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');
const { updateBotStatus } = require('../utils/statusUtils');

/**
 * Sendet eine Ping-Benachrichtigung, die nach 5 Sekunden gelöscht wird
 */
async function sendTempPingNotification(channel, roleId, message) {
    if (!roleId) return;
    
    try {
        const pingMsg = await channel.send(`<@&${roleId}> ${message}`);
        
        // Nach 5 Sekunden wieder löschen
        setTimeout(async () => {
            try {
                await pingMsg.delete();
            } catch (err) {
                console.error('Fehler beim Löschen der Ping-Nachricht:', err);
            }
        }, 5000);
    } catch (err) {
        console.error('Fehler beim Senden der Ping-Nachricht:', err);
    }
}

/**
 * Überprüft auf Änderungen im Vertretungsplan ohne eine neue Nachricht zu senden
 */
async function checkPlanChanges(client) {
    try {
        // Bot-Status aktualisieren vor API-Abruf
        await updateBotStatus(client);
        
        // Wenn API nicht verfügbar ist, abbrechen
        if (!cache.apiAvailable) {
            console.log('API ist nicht erreichbar - Überspringe Änderungsprüfung');
            return;
        }
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        
        // Daten abrufen
        const data = await fetchData(dateParam);
        
        // Wenn die API ein leeres Array zurückgibt, keine Aktualisierung durchführen
        if (!data || data.length === 0) {
            console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            return;
        }
        
        // Benachrichtigungs-Channel holen
        const notificationChannel = client.channels.cache.get(NOTIFICATION_CHANNEL_ID);
        if (!notificationChannel) {
            console.error('Benachrichtigungs-Channel nicht gefunden!');
            return;
        }
        
        // Überprüfen, ob sich die Daten geändert haben
        const dataChanged = hasDataChanged(cache.lastData, data);
        
        // Wenn sich die Daten geändert haben und es vorherige Daten gibt
        if (dataChanged && cache.lastData) {
            const targetDateStr = formatReadableDate(targetDate);
            
            // Spezifische Änderungen identifizieren
            const { newSubstitutions, newCancellations } = findChanges(cache.lastData, data);
            
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
                updateEmbed.addFields({ 
                    name: '🔍 DEBUG: Rohdaten (alte Daten)', 
                    value: '```json\n' + JSON.stringify(cache.lastData, null, 2).substring(0, 1000) + '...\n```' 
                });
                
                updateEmbed.addFields({ 
                    name: '🔍 DEBUG: Rohdaten (neue Daten)', 
                    value: '```json\n' + JSON.stringify(data, null, 2).substring(0, 1000) + '...\n```' 
                });
            }
                
            // Embed senden ohne Rollenerwähnung
            await notificationChannel.send({ embeds: [updateEmbed] });
            
            // Separate Ping-Nachricht senden, die nach 5 Sekunden gelöscht wird
            if (UPDATE_ROLE_ID) {
                await sendTempPingNotification(
                    notificationChannel, 
                    UPDATE_ROLE_ID, 
                    'Der Vertretungsplan wurde aktualisiert!'
                );
            }
            
            // Speichere die neuen Daten
            cache.lastData = data;
            
            console.log(`Änderungen im Vertretungsplan erkannt: ${new Date().toLocaleString()}`);
        } else if (dataChanged) {
            // Initialzustand - speichern ohne zu benachrichtigen
            cache.lastData = data;
            console.log(`Initiale Daten gespeichert: ${new Date().toLocaleString()}`);
        } else {
            console.log(`Keine Änderungen im Vertretungsplan: ${new Date().toLocaleString()}`);
        }
        
        // Letzten Prüfzeitpunkt speichern
        cache.lastCheck = new Date();
        
    } catch (err) {
        console.error('Fehler beim Überprüfen auf Änderungen:', err);
    }
}

/**
 * Aktualisiert den Vertretungsplan vollständig (Bild und ggf. Benachrichtigung)
 */
async function updatePlan(client) {
    try {
        // Bot-Status aktualisieren vor API-Abruf
        await updateBotStatus(client);
        
        // Wenn API nicht verfügbar ist, abbrechen
        if (!cache.apiAvailable) {
            console.log('API ist nicht erreichbar - Überspringe Planaktualisierung');
            return;
        }
        
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        
        // Daten abrufen
        const data = await fetchData(dateParam);
        
        // Wenn die API ein leeres Array zurückgibt, keine Aktualisierung durchführen
        if (!data || data.length === 0) {
            console.log(`Keine Daten für ${dateParam} verfügbar - Überspringe Aktualisierung`);
            return;
        }
        
        // Plan-Channel holen
        const planChannel = client.channels.cache.get(PLAN_CHANNEL_ID);
        if (!planChannel) {
            console.error('Plan-Channel nicht gefunden!');
            return;
        }
        
        // Prüfen auf Änderungen und ggf. benachrichtigen
        await checkPlanChanges(client);
        
        // Bild erstellen
        const imageBuffer = await createPlanImage(data, targetDate);
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'vertretungsplan.png' });
        
        // Alte Nachricht löschen, falls vorhanden
        if (cache.lastMessageId) {
            try {
                const oldMessage = await planChannel.messages.fetch(cache.lastMessageId);
                if (oldMessage) {
                    await oldMessage.delete();
                }
            } catch (err) {
                console.error('Fehler beim Löschen der alten Nachricht:', err);
            }
        }
        
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
            cache.lastMessageId = newMessage.id;
        } else {
            // Normale Nachricht ohne Debug-Informationen
            const newMessage = await planChannel.send({
                content: messageContent,
                files: [attachment],
                components: components
            });
            
            // Neue Nachricht-ID speichern
            cache.lastMessageId = newMessage.id;
        }
        
        console.log(`Vertretungsplan aktualisiert: ${new Date().toLocaleString()}`);
    } catch (err) {
        console.error('Fehler beim Aktualisieren des Vertretungsplans:', err);
    }
}

module.exports = {
    updatePlan,
    checkPlanChanges,
    sendTempPingNotification
};
