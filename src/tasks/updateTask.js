const { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PLAN_CHANNEL_ID, NOTIFICATION_CHANNEL_ID, UPDATE_ROLE_ID, cache } = require('../config');
const { getTargetDate, formatDate, formatReadableDate } = require('../utils/dateUtils');
const { hasDataChanged, findChanges } = require('../utils/dataUtils');
const { fetchData } = require('../services/apiService');
const { createPlanImage } = require('../services/imageService');

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
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        
        // Daten abrufen
        const data = await fetchData(dateParam);
        
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
        // Nächsten Schultag ermitteln
        const targetDate = getTargetDate();
        const dateParam = formatDate(targetDate);
        
        // Daten abrufen
        const data = await fetchData(dateParam);
        
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
        
        const newMessage = await planChannel.send({
            content: `**Vertretungsplan für ${targetDateStr}**`,
            files: [attachment],
            components: components
        });
        
        // Neue Nachricht-ID speichern
        cache.lastMessageId = newMessage.id;
        
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
