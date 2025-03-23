const { SlashCommandBuilder } = require('discord.js');

/**
 * Definiert die Slash-Befehle für den Bot
 */
const commands = [
    new SlashCommandBuilder()
        .setName('test-plan')
        .setDescription('Testet die Generierung des Vertretungsplans'),
    
    new SlashCommandBuilder()
        .setName('test-update')
        .setDescription('Testet die Erkennung von Änderungen')
        .addStringOption(option => 
            option.setName('datum')
                .setDescription('Datum im Format DD.MM.YYYY')
                .setRequired(false)),
    
    new SlashCommandBuilder()
        .setName('test-notification')
        .setDescription('Testet die Benachrichtigungsfunktion'),
    
    new SlashCommandBuilder()
        .setName('force-update')
        .setDescription('Erzwingt ein Update des Vertretungsplans'),

    new SlashCommandBuilder()
        .setName('clear-channel')
        .setDescription('Löscht alle Nachrichten im Vertretungsplan-Channel'),

    new SlashCommandBuilder()
        .setName('setup-role')
        .setDescription('Erstellt eine Rolle für Vertretungsplan-Benachrichtigungen falls nötig')
        .setDefaultMemberPermissions(0) // Administrator-Berechtigungen erforderlich
];

/**
 * Registriert die Slash-Befehle beim Discord-API
 */
async function registerCommands(client) {
    try {
        console.log('Registriere Slash-Commands...');
        
        const { REST, Routes } = require('discord.js');
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands.map(command => command.toJSON()) },
        );
        
        console.log('Slash-Commands erfolgreich registriert!');
    } catch (error) {
        console.error('Fehler beim Registrieren der Slash-Commands:', error);
    }
}

module.exports = {
    commands,
    registerCommands
};
