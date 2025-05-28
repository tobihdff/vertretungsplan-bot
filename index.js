const { Client } = require('discord.js');
const { CLIENT_CONFIG, DEBUG } = require('./src/config');
const { setupHandlers } = require('./src/bot/handlers');
const { debugLog } = require('./src/utils/debugUtils');

if (DEBUG) {
    console.log('🔍 DEBUG-MODUS AKTIV');
    debugLog('Bot wird im Debug-Modus gestartet');
}

const client = new Client(CLIENT_CONFIG);
debugLog('Discord Client erstellt mit Intents: ' + JSON.stringify(CLIENT_CONFIG.intents));

setupHandlers(client);
debugLog('Bot-Handler wurden eingerichtet');

client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('Bot angemeldet');
        debugLog('Bot erfolgreich angemeldet');
    })
    .catch(error => {
        console.error('Fehler beim Anmelden:', error);
        debugLog(`Fehler beim Anmelden: ${error.message}`);
    });

process.on('unhandledRejection', error => {
    console.error('Unbehandelter Promise-Fehler:', error);
    debugLog(`KRITISCH: Unbehandelter Promise-Fehler: ${error.message}`);
});

if (DEBUG) {
    debugLog(`Node.js Version: ${process.version}`);
    debugLog(`Plattform: ${process.platform} (${process.arch})`);
    debugLog(`Arbeitsspeicher: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
    
    process.on('SIGINT', () => {
        debugLog('Bot wird durch SIGINT beendet');
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        debugLog('Bot wird durch SIGTERM beendet');
        process.exit(0);
    });
}