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
        
        // Im Wartungsmodus DND-Status setzen
        if (cache.maintenanceMode) {
            debugLog('Wartungsmodus aktiv - setze DND-Status');
            
            await client.user.setPresence({
                activities: [{
                    name: BOT_STATUS.MAINTENANCE.name,
                    type: ActivityType.Playing
                }],
                status: BOT_STATUS.PRESENCE.DND
            });
            
            return;
        }
        
        // Standard-Status setzen wenn kein Wartungsmodus
        debugLog('Bot-Status-Update - setze Standard-Online-Status');
        
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
 */
async function setInitialBotStatus(client) {
    debugLog('Setze initialen Bot-Status');
    
    // Sicherstellen, dass der Client bereit ist
    if (!client || !client.user) {
        console.error('Client nicht bereit - Initialer Status konnte nicht gesetzt werden');
        return;
    }
    
    // Prüfe auf aktiven Wartungsmodus
    if (cache.maintenanceMode) {
        debugLog('Wartungsmodus aktiv - setze DND-Status');
        
        try {
            await client.user.setPresence({
                activities: [{
                    name: BOT_STATUS.MAINTENANCE.name,
                    type: ActivityType.Playing
                }],
                status: BOT_STATUS.PRESENCE.DND
            });
            
            debugLog('Initialer Bot-Status gesetzt (Wartungsmodus)');
            cache.initialStatusSet = true;
            return;
        } catch (err) {
            console.error('Fehler beim Setzen des Wartungsmodus-Status:', err);
            debugLog(`Fehler beim Wartungsmodus-Status: ${err.message}`);
        }
    }
    
    // Setze Standard Online-Status
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

/**
 * Aktiviert den Wartungsmodus
 */
async function enableMaintenanceMode(client) {
    debugLog('Aktiviere Wartungsmodus');
    
    // Wartungsmodus-Flag setzen
    cache.maintenanceMode = true;
    
    // Bot-Status aktualisieren
    await updateBotStatus(client);
    
    debugLog('Wartungsmodus wurde aktiviert');
    return true;
}

/**
 * Deaktiviert den Wartungsmodus
 */
async function disableMaintenanceMode(client) {
    debugLog('Deaktiviere Wartungsmodus');
    
    // Wartungsmodus-Flag zurücksetzen
    cache.maintenanceMode = false;
    
    // Normalen Bot-Status wiederherstellen
    await updateBotStatus(client);
    
    debugLog('Wartungsmodus wurde deaktiviert');
    return true;
}

/**
 * Prüft, ob der Wartungsmodus aktiv ist
 */
function isMaintenanceModeActive() {
    return !!cache.maintenanceMode;
}

module.exports = {
    updateBotStatus,
    startApiMonitoring,
    setInitialBotStatus,
    enableMaintenanceMode,
    disableMaintenanceMode,
    isMaintenanceModeActive
};
