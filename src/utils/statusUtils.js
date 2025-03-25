const { ActivityType } = require('discord.js');
const { BOT_STATUS, cache, DEBUG } = require('../config');
const { checkApiAvailability } = require('../services/apiService');
const { debugLog } = require('./debugUtils');

/**
 * Aktualisiert den Bot-Status basierend auf der API-Erreichbarkeit
 */
async function updateBotStatus(client) {
    try {
        const { available, statusChanged } = await checkApiAvailability();
        
        debugLog(`Aktualisiere Bot-Status: API verfügbar=${available}, Status geändert=${statusChanged}`);
        
        // Bei jeder Statusänderung aktualisieren (nicht nur wenn cache.statusChanged gesetzt ist)
        if (statusChanged || available !== Boolean(cache.apiAvailable)) {
            if (available) {
                // API ist erreichbar - Online-Status setzen
                debugLog('Setze Bot-Status auf ONLINE');
                await client.user.setPresence({
                    activities: [{
                        name: BOT_STATUS.ACTIVITY.name,
                        type: ActivityType.Watching
                    }],
                    status: BOT_STATUS.PRESENCE.ONLINE
                });
                console.log('Bot-Status: Online - Watching Vertretungsplan');
            } else {
                // API ist nicht erreichbar - Do Not Disturb Status setzen
                debugLog('Setze Bot-Status auf DND (Do Not Disturb)');
                await client.user.setPresence({
                    activities: [], // Keine Aktivität
                    status: BOT_STATUS.PRESENCE.DND
                });
                console.log('Bot-Status: Do Not Disturb - API nicht erreichbar');
            }
            
            cache.statusChanged = true;
        } else {
            cache.statusChanged = false;
        }
        
        // Cache-Status immer aktualisieren, um sicherzustellen, dass er mit der Realität übereinstimmt
        cache.apiAvailable = available;
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
            debugLog('API-Monitoring: Überprüfe API-Status');
            const { available } = await checkApiAvailability();
            
            if (available) {
                // Wenn API wieder erreichbar ist, beende das Monitoring und setze den Status zurück
                if (monitoringInterval) {
                    clearInterval(monitoringInterval);
                    monitoringInterval = null;
                    debugLog('API-Monitoring: Beende Monitoring - API ist wieder erreichbar');
                    console.log('API-Monitoring beendet - API ist wieder erreichbar');
                }
                
                // Status aktualisieren, auch wenn kein Monitoring lief
                if (!cache.apiAvailable) {
                    debugLog('API vorher nicht erreichbar, jetzt verfügbar - Erzwinge Status-Update');
                    cache.apiAvailable = true;
                    cache.statusChanged = true;
                    await updateBotStatus(client);
                }
            } else if (!monitoringInterval) {
                // Wenn API nicht erreichbar ist und noch kein Monitoring läuft, starte es
                debugLog(`API-Monitoring: Starte Monitoring alle ${retryInterval / 60000} Minuten`);
                console.log(`API ist nicht erreichbar - Starte Monitoring alle ${retryInterval / 60000} Minuten`);
                cache.apiAvailable = false;
                cache.statusChanged = true;
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
