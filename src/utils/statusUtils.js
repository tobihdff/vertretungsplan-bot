const { ActivityType } = require('discord.js');
const { BOT_STATUS, cache, DEBUG } = require('../config');
const { checkApiAvailability, ERROR_THRESHOLD, CONFIRMATION_COUNT } = require('../services/apiService');
const { debugLog } = require('./debugUtils');

/**
 * Aktualisiert den Bot-Status basierend auf der API-Erreichbarkeit
 */
async function updateBotStatus(client) {
    try {
        const result = await checkApiAvailability();
        const { available, statusChanged, errorCount, confirmationCount } = result;
        
        debugLog(`Aktualisiere Bot-Status: API verfügbar=${available}, Status geändert=${statusChanged}, Fehlerzähler=${errorCount}/${ERROR_THRESHOLD}, Bestätigungen=${confirmationCount}/${CONFIRMATION_COUNT}`);
        
        // Nur Status ändern, wenn die API-Prüfung eine Statusänderung festgestellt hat
        // oder wenn die Konsistenz zwischen cache und Statusprüfung nicht mehr gegeben ist
        if (statusChanged || available !== cache.apiAvailable) {
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
            const result = await checkApiAvailability();
            const { available, errorCount } = result;
            
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
                    // Wir setzen cache.apiAvailable nicht direkt, sondern warten auf Bestätigung
                    // durch das normale Statusupdate, um Statusflackern zu vermeiden
                    cache.statusChanged = true;
                    await updateBotStatus(client);
                }
            } else if (!monitoringInterval && errorCount >= ERROR_THRESHOLD) {
                // Nur wenn Fehlerschwelle überschritten ist, Monitoring starten
                debugLog(`API-Monitoring: Starte Monitoring alle ${retryInterval / 60000} Minuten (Fehlerzähler: ${errorCount}/${ERROR_THRESHOLD})`);
                console.log(`API ist nicht erreichbar - Starte Monitoring alle ${retryInterval / 60000} Minuten`);
                // cache.apiAvailable wird durch updateBotStatus gesetzt
                cache.statusChanged = true;
                monitoringInterval = setInterval(() => checkAndUpdateStatus(), retryInterval);
            } else if (errorCount < ERROR_THRESHOLD && cache.apiAvailable === false) {
                // Wenn Fehler unter Schwellenwert, aber wir als nicht verfügbar markiert sind,
                // API-Status prüfen (durch updateBotStatus)
                debugLog(`API-Fehler unter Schwellenwert (${errorCount}/${ERROR_THRESHOLD}) aber als nicht verfügbar markiert - Prüfe Status`);
                await updateBotStatus(client);
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
