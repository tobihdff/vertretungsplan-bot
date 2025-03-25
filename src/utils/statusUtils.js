const { ActivityType } = require('discord.js');
const { BOT_STATUS, cache, DEBUG } = require('../config');
const { checkApiAvailability, ERROR_THRESHOLD, CONFIRMATION_COUNT } = require('../services/apiService');
const { debugLog } = require('./debugUtils');

/**
 * Aktualisiert den Bot-Status basierend auf der API-Erreichbarkeit
 * (Temporär deaktiviert - setzt immer Online-Status)
 */
async function updateBotStatus(client) {
    try {
        // Sicherstellen, dass der Client bereit ist
        if (!client || !client.user) {
            debugLog('Client oder client.user noch nicht verfügbar - Status-Update übersprungen');
            return;
        }
        
        // Status-Überprüfung deaktiviert - immer verfügbar
        debugLog('Bot-Status-Update deaktiviert - setze Standard-Online-Status');
        
        // Setze Online-Status mit standard Aktivität
        await client.user.setPresence({
            activities: [{
                name: BOT_STATUS.ACTIVITY.name,
                type: ActivityType.Watching
            }],
            status: BOT_STATUS.PRESENCE.ONLINE
        });
        
        // Sicherstellen, dass API als verfügbar angezeigt wird
        cache.apiAvailable = true;
        cache.statusChanged = false;
        cache.initialStatusSet = true;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Bot-Status:', error);
        debugLog(`Fehler beim Status-Update: ${error.message}`);
    }
}

/**
 * Setzt den initialen Bot-Status beim Start
 * (Temporär vereinfacht)
 */
async function setInitialBotStatus(client) {
    debugLog('Setze initialen Bot-Status (deaktiviert - nur Online-Status)');
    
    // Sicherstellen, dass der Client bereit ist
    if (!client || !client.user) {
        console.error('Client nicht bereit - Initialer Status konnte nicht gesetzt werden');
        return;
    }
    
    // Setze einfach Online-Status
    try {
        await client.user.setPresence({
            activities: [{
                name: BOT_STATUS.ACTIVITY.name,
                type: ActivityType.Watching
            }],
            status: BOT_STATUS.PRESENCE.ONLINE
        });
        
        // Setze Cache-Werte
        cache.apiAvailable = true;
        cache.statusChanged = false;
        cache.initialStatusSet = true;
        
        debugLog('Initialer Bot-Status gesetzt (Online)');
    } catch (err) {
        console.error('Fehler beim Setzen des initialen Status:', err);
    }
}

/**
 * API-Monitoring deaktiviert - gibt leere Funktion zurück
 */
function startApiMonitoring(client, retryInterval) {
    debugLog('API-Monitoring deaktiviert');
    
    // Gibt leere Funktion zurück, die nichts tut
    return async function() {
        debugLog('API-Monitoring-Funktion aufgerufen - deaktiviert, keine Aktion');
    }
}

module.exports = {
    updateBotStatus,
    startApiMonitoring,
    setInitialBotStatus
};
