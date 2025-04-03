/**
 * Hauptdatei für den Vertretungsplan Discord Bot
 */
const { Client } = require('discord.js');
const { CLIENT_CONFIG, DEBUG } = require('./src/config');
const { setupHandlers } = require('./src/bot/handlers');
const { debugLog } = require('./src/utils/debugUtils');
const ApiWebService = require('./src/services/apiWebService');

// Debug-Modus Status ausgeben
if (DEBUG) {
    console.log('🔍 DEBUG-MODUS AKTIV');
    debugLog('Bot wird im Debug-Modus gestartet');
}

// Discord Client erstellen
const client = new Client(CLIENT_CONFIG);
debugLog('Discord Client erstellt mit Intents: ' + JSON.stringify(CLIENT_CONFIG.intents));

// Event-Handler einrichten
setupHandlers(client);
debugLog('Bot-Handler wurden eingerichtet');

// API Web Service für das Webpanel initialisieren
let apiService;

// Bot einloggen
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot angemeldet');
        debugLog('Bot erfolgreich angemeldet');
        
        // API-Server nach erfolgreicher Anmeldung starten
        apiService = new ApiWebService(client, require('./src/config'));
        apiService.start();
    })
    .catch(error => {
        console.error('Fehler beim Anmelden:', error);
        debugLog(`Fehler beim Anmelden: ${error.message}`);
    });

// Fehlerbehandlung für unerwartete Fehler
process.on('unhandledRejection', error => {
    console.error('Unbehandelter Promise-Fehler:', error);
    debugLog(`KRITISCH: Unbehandelter Promise-Fehler: ${error.message}`);
});

// Zusätzliche Debug-Informationen
if (DEBUG) {
    debugLog(`Node.js Version: ${process.version}`);
    debugLog(`Plattform: ${process.platform} (${process.arch})`);
    debugLog(`Arbeitsspeicher: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
    
    // Event-Listener für Prozessbeendigung
    process.on('SIGINT', () => {
        debugLog('Bot wird durch SIGINT beendet');
        
        // API-Server stoppen, falls vorhanden
        if (apiService) {
            apiService.stop();
        }
        
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        debugLog('Bot wird durch SIGTERM beendet');
        
        // API-Server stoppen, falls vorhanden
        if (apiService) {
            apiService.stop();
        }
        
        process.exit(0);
    });
}