const { ActivityType } = require('discord.js');
const { BOT_STATUS, cache } = require('../config');
const { checkApiAvailability } = require('../services/apiService');

/**
 * Aktualisiert den Bot-Status basierend auf der API-Erreichbarkeit
 */
async function updateBotStatus(client) {
    try {
        const { available, statusChanged } = await checkApiAvailability();
        
        // Wenn sich der Status nicht geändert hat, nichts tun
        if (!statusChanged && cache.statusChanged) return;
        
        if (available) {
            // API ist erreichbar - Online-Status setzen
            await client.user.setPresence({
                activities: [{
                    name: BOT_STATUS.ACTIVITY.name,
                    type: ActivityType.Watching
                }],
                status: BOT_STATUS.PRESENCE.ONLINE
            });
            if (statusChanged) {
                console.log('Bot-Status: Online - Watching Vertretungsplan');
            }
        } else {
            // API ist nicht erreichbar - Do Not Disturb Status setzen
            await client.user.setPresence({
                activities: [], // Keine Aktivität
                status: BOT_STATUS.PRESENCE.DND
            });
            if (statusChanged) {
                console.log('Bot-Status: Do Not Disturb - API nicht erreichbar');
            }
        }
        
        cache.statusChanged = statusChanged;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Bot-Status:', error);
    }
}

/**
 * Überprüft regelmäßig die API-Erreichbarkeit und aktualisiert den Bot-Status
 * im Fehlerfall
 */
function startApiMonitoring(client, retryInterval) {
    let monitoringInterval = null;
    
    async function checkAndUpdateStatus() {
        try {
            const { available } = await checkApiAvailability();
            
            if (available) {
                // Wenn API wieder erreichbar ist, beende das Monitoring und setze den Status zurück
                if (monitoringInterval) {
                    clearInterval(monitoringInterval);
                    monitoringInterval = null;
                    console.log('API-Monitoring beendet - API ist wieder erreichbar');
                }
                
                // Setze Online-Status
                await updateBotStatus(client);
            } else if (!monitoringInterval) {
                // Wenn API nicht erreichbar ist und noch kein Monitoring läuft, starte es
                console.log(`API ist nicht erreichbar - Starte Monitoring alle ${retryInterval / 60000} Minuten`);
                monitoringInterval = setInterval(() => checkAndUpdateStatus(), retryInterval);
            }
        } catch (error) {
            console.error('Fehler im API-Monitoring:', error);
        }
    }
    
    return checkAndUpdateStatus;
}

module.exports = {
    updateBotStatus,
    startApiMonitoring
};
