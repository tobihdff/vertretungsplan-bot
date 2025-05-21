const { ActivityType } = require('discord.js');
const { BOT_STATUS, cache, DEBUG } = require('../config');
const { checkApiAvailability, ERROR_THRESHOLD, CONFIRMATION_COUNT } = require('../services/apiService');
const { debugLog } = require('./debugUtils');

async function updateBotStatus(client) {
    try {
        if (!client || !client.user) {
            debugLog('Client oder client.user noch nicht verfügbar - Status-Update übersprungen');
            return;
        }
        
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
        
        debugLog('Bot-Status-Update - setze Standard-Online-Status');
        
        await client.user.setPresence({
            activities: [{
                name: BOT_STATUS.ACTIVITY.name,
                type: ActivityType.Watching
            }],
            status: BOT_STATUS.PRESENCE.ONLINE
        });
        
        cache.apiAvailable = true;
        cache.statusChanged = false;
        cache.initialStatusSet = true;
    } catch (error) {
        console.error('Fehler beim Aktualisieren des Bot-Status:', error);
        debugLog(`Fehler beim Status-Update: ${error.message}`);
    }
}

async function setInitialBotStatus(client) {
    debugLog('Setze initialen Bot-Status');
    
    if (!client || !client.user) {
        console.error('Client nicht bereit - Initialer Status konnte nicht gesetzt werden');
        return;
    }
    
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
    
    try {
        await client.user.setPresence({
            activities: [{
                name: BOT_STATUS.ACTIVITY.name,
                type: ActivityType.Watching
            }],
            status: BOT_STATUS.PRESENCE.ONLINE
        });
        
        cache.apiAvailable = true;
        cache.statusChanged = false;
        cache.initialStatusSet = true;
        
        debugLog('Initialer Bot-Status gesetzt (Online)');
    } catch (err) {
        console.error('Fehler beim Setzen des initialen Status:', err);
    }
}

function startApiMonitoring(client, retryInterval) {
    debugLog('API-Monitoring deaktiviert');
    
    return async function() {
        debugLog('API-Monitoring-Funktion aufgerufen - deaktiviert, keine Aktion');
    }
}

async function enableMaintenanceMode(client) {
    debugLog('Aktiviere Wartungsmodus');
    
    cache.maintenanceMode = true;
    
    await updateBotStatus(client);
    
    debugLog('Wartungsmodus wurde aktiviert');
    return true;
}

async function disableMaintenanceMode(client) {
    debugLog('Deaktiviere Wartungsmodus');
    
    cache.maintenanceMode = false;
    
    await updateBotStatus(client);
    
    debugLog('Wartungsmodus wurde deaktiviert');
    return true;
}

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
