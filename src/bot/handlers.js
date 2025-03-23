const { registerCommands } = require('./commands');
const { isAuthorized, testPlanGeneration, testUpdateDetection, testNotification } = require('./tests');
const { updatePlan, checkPlanChanges } = require('../tasks/updateTask');
const { AUTHORIZED_USERS, INTERVALS, PLAN_CHANNEL_ID, UPDATE_ROLE_ID, cache } = require('../config');

/**
 * Löscht alle Nachrichten in einem Channel, wenn die Berechtigungen ausreichen
 */
async function clearChannel(channel) {
    try {
        console.log(`Versuche Nachrichten im Channel ${channel.name} zu löschen...`);
        
        // Überprüfe zuerst die Berechtigungen
        const permissions = channel.permissionsFor(channel.client.user);
        
        if (!permissions.has('ManageMessages')) {
            console.warn(`⚠️ Warnung: Bot hat keine Berechtigung zum Löschen von Nachrichten im Channel ${channel.name}!`);
            console.warn('Bitte gib dem Bot die "Nachrichten verwalten" Berechtigung oder lösche die Nachrichten manuell.');
            return false;
        }
        
        // Nachrichten laden und löschen
        let messages;
        let deleted = 0;
        
        do {
            try {
                // Discord erlaubt nur das Löschen von maximal 100 Nachrichten auf einmal
                messages = await channel.messages.fetch({ limit: 100 });
                
                if (messages.size > 0) {
                    // Bulk Delete für Nachrichten, die nicht älter als 14 Tage sind
                    const recentMessages = messages.filter(msg => {
                        const twoWeeksAgo = new Date();
                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                        return msg.createdAt > twoWeeksAgo;
                    });
                    
                    if (recentMessages.size > 0) {
                        await channel.bulkDelete(recentMessages, true);  // true = filterOld
                        deleted += recentMessages.size;
                    }
                    
                    // Ältere Nachrichten können nicht via bulkDelete gelöscht werden
                    // Wir überspringen sie, da wir sie nicht löschen können
                    const olderMessages = messages.filter(msg => {
                        const twoWeeksAgo = new Date();
                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                        return msg.createdAt <= twoWeeksAgo;
                    });
                    
                    if (olderMessages.size > 0) {
                        console.log(`${olderMessages.size} Nachrichten sind älter als 14 Tage und können nicht gelöscht werden.`);
                    }
                }
            } catch (error) {
                console.error('Fehler beim Löschen der Nachrichten:', error);
                return false;
            }
        } while (messages.size >= 100 && messages.some(msg => {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            return msg.createdAt > twoWeeksAgo;
        }));
        
        console.log(`${deleted} Nachrichten wurden gelöscht.`);
        return true;
    } catch (error) {
        console.error('Fehler beim Löschen der Nachrichten:', error);
        return false;
    }
}

/**
 * Initialisiert Bot-Handler
 */
function setupHandlers(client) {
    // Handler für das Ready-Event
    client.once('ready', async () => {
        console.log(`Bot ist online als ${client.user.tag}`);
        
        // Registriere Slash-Commands
        await registerCommands(client);
        
        // Beim ersten Start alle Nachrichten im Plan-Channel löschen
        if (!cache.initialized) {
            const planChannel = client.channels.cache.get(PLAN_CHANNEL_ID);
            if (planChannel) {
                const success = await clearChannel(planChannel);
                if (success) {
                    console.log('Bot-Initialisierung abgeschlossen: Nachrichten gelöscht.');
                } else {
                    console.warn('Bot-Initialisierung abgeschlossen: Konnte Nachrichten nicht löschen.');
                }
                cache.initialized = true;
            } else {
                console.error('Plan-Channel nicht gefunden!');
            }
        }
        
        // Initialen Update durchführen
        await updatePlan(client);
        
        console.log(`Update-Intervall: ${INTERVALS.UPDATE_INTERVAL / 60000} Minuten`);
        console.log(`Prüf-Intervall: ${INTERVALS.CHECK_INTERVAL / 60000} Minuten`);
        
        // Separate Intervalle für Vollaktualisierung und Änderungsprüfung
        setInterval(() => updatePlan(client), INTERVALS.UPDATE_INTERVAL);
        setInterval(() => checkPlanChanges(client), INTERVALS.CHECK_INTERVAL);
    });
    
    // Handler für Interaktionen (Commands und Buttons)
    client.on('interactionCreate', async interaction => {
        // Slash-Command Handler
        if (interaction.isCommand()) {
            // Prüfe Berechtigung für normale Befehle
            if (interaction.commandName !== 'setup-role' && !isAuthorized(interaction.user.id, AUTHORIZED_USERS)) {
                return interaction.reply({ 
                    content: '❌ Du bist nicht berechtigt, diesen Befehl auszuführen.', 
                    ephemeral: true 
                });
            }
            
            const { commandName } = interaction;
            
            switch (commandName) {
                case 'test-plan':
                    await testPlanGeneration(interaction);
                    break;
                    
                case 'test-update':
                    const date = interaction.options.getString('datum');
                    await testUpdateDetection(interaction, date);
                    break;
                    
                case 'test-notification':
                    await testNotification(interaction, client);
                    break;
                    
                case 'force-update':
                    await interaction.reply('🔄 Erzwinge Update des Vertretungsplans...');
                    await updatePlan(client);
                    await interaction.editReply('✅ Update des Vertretungsplans abgeschlossen!');
                    break;
                    
                case 'clear-channel':
                    await interaction.reply('🧹 Versuche alle Nachrichten im Vertretungsplan-Channel zu löschen...');
                    const planChannel = client.channels.cache.get(PLAN_CHANNEL_ID);
                    if (planChannel) {
                        const success = await clearChannel(planChannel);
                        if (success) {
                            await interaction.editReply('✅ Alle Nachrichten wurden gelöscht!');
                        } else {
                            await interaction.editReply('⚠️ Konnte Nachrichten nicht löschen. Fehlen die Berechtigungen?');
                        }
                    } else {
                        await interaction.editReply('❌ Plan-Channel nicht gefunden!');
                    }
                    break;
                    
                case 'setup-role':
                    // Prüfe, ob Rolle konfiguriert ist
                    if (!UPDATE_ROLE_ID) {
                        return interaction.reply({
                            content: '❌ Die UPDATE_ROLE_ID ist nicht in der .env-Datei konfiguriert.',
                            ephemeral: true
                        });
                    }
                    
                    await interaction.deferReply();
                    
                    try {
                        // Prüfe, ob Rolle existiert
                        let role = interaction.guild.roles.cache.get(UPDATE_ROLE_ID);
                        
                        if (role) {
                            await interaction.editReply(`✅ Die Rolle "${role.name}" (ID: ${role.id}) ist bereits eingerichtet.`);
                        } else {
                            // Erstelle neue Rolle
                            role = await interaction.guild.roles.create({
                                name: 'Vertretungsplan-Updates',
                                color: '#FFA500',
                                reason: 'Automatisch erstellte Rolle für Vertretungsplan-Benachrichtigungen'
                            });
                            
                            await interaction.editReply(`✅ Rolle "${role.name}" wurde erstellt! Bitte setze UPDATE_ROLE_ID=${role.id} in der .env-Datei.`);
                        }
                    } catch (error) {
                        console.error('Fehler beim Rollen-Setup:', error);
                        await interaction.editReply('❌ Es ist ein Fehler beim Erstellen/Prüfen der Rolle aufgetreten. Bitte prüfe die Bot-Berechtigungen.');
                    }
                    break;
            }
        }
        
        // Button-Handler für Rollensteuerung
        if (interaction.isButton()) {
            if (!UPDATE_ROLE_ID) {
                return await interaction.reply({
                    content: '❌ Die Benachrichtigungsfunktion ist nicht konfiguriert.',
                    ephemeral: true
                });
            }
            
            const { customId } = interaction;
            const member = interaction.member;
            
            try {
                const role = interaction.guild.roles.cache.get(UPDATE_ROLE_ID);
                
                if (!role) {
                    return await interaction.reply({
                        content: '❌ Die Benachrichtigungsrolle wurde nicht gefunden.',
                        ephemeral: true
                    });
                }
                
                if (customId === 'role_subscribe') {
                    // Rolle hinzufügen
                    if (member.roles.cache.has(role.id)) {
                        await interaction.reply({
                            content: '✅ Du erhältst bereits Benachrichtigungen bei Änderungen!',
                            ephemeral: true
                        });
                    } else {
                        await member.roles.add(role);
                        await interaction.reply({
                            content: '🔔 Du erhältst jetzt Benachrichtigungen bei Änderungen im Vertretungsplan!',
                            ephemeral: true
                        });
                    }
                } else if (customId === 'role_unsubscribe') {
                    // Rolle entfernen
                    if (!member.roles.cache.has(role.id)) {
                        await interaction.reply({
                            content: '✅ Du erhältst bereits keine Benachrichtigungen!',
                            ephemeral: true
                        });
                    } else {
                        await member.roles.remove(role);
                        await interaction.reply({
                            content: '🔕 Du erhältst keine Benachrichtigungen mehr bei Änderungen im Vertretungsplan.',
                            ephemeral: true
                        });
                    }
                }
            } catch (error) {
                console.error('Fehler bei der Rollenbearbeitung:', error);
                await interaction.reply({
                    content: '❌ Es ist ein Fehler aufgetreten. Bitte wende dich an einen Administrator.',
                    ephemeral: true
                });
            }
        }
    });
}

module.exports = {
    setupHandlers,
    clearChannel
};