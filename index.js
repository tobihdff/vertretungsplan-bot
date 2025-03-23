/**
 * Hauptdatei für den Vertretungsplan Discord Bot
 */
const { Client } = require('discord.js');
const { CLIENT_CONFIG } = require('./src/config');
const { setupHandlers } = require('./src/bot/handlers');

// Discord Client erstellen
const client = new Client(CLIENT_CONFIG);

// Event-Handler einrichten
setupHandlers(client);

// Bot einloggen
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('Bot angemeldet'))
    .catch(error => console.error('Fehler beim Anmelden:', error));

// Fehlerbehandlung für unerwartete Fehler
process.on('unhandledRejection', error => {
    console.error('Unbehandelter Promise-Fehler:', error);
});