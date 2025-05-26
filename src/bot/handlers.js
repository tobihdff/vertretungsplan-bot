const { registerCommands } = require('./commands');
const { isAuthorized, testPlanGeneration, testUpdateDetection, testNotification, testHolidayMode } = require('./tests');
const { updatePlan, checkPlanChanges } = require('../tasks/updateTask');
const { AUTHORIZED_USERS, INTERVALS, PLAN_CHANNEL_ID, UPDATE_ROLE_ID, cache, DEBUG } = require('../config');
const { updateBotStatus, startApiMonitoring, setInitialBotStatus, enableMaintenanceMode, disableMaintenanceMode, isMaintenanceModeActive } = require('../utils/statusUtils');
const { debugLog } = require('../utils/debugUtils');
const { fetchKlassenbuch } = require('../services/apiService');
const dateUtils = require('../utils/dateUtils');
const { getKlassenbuchData, createEmbed, createEmbeds } = require('../services/klassenbuchService');

async function clearChannel(channel) {
    try {
        debugLog(`Versuche Nachrichten im Channel ${channel.name} (ID: ${channel.id}) zu löschen`);
        console.log(`Versuche Nachrichten im Channel ${channel.name} zu löschen...`);
        
        const permissions = channel.permissionsFor(channel.client.user);
        
        if (!permissions.has('ManageMessages')) {
            debugLog(`Keine Berechtigung zum Löschen von Nachrichten in ${channel.name}`);
            console.warn(`⚠️ Warnung: Bot hat keine Berechtigung zum Löschen von Nachrichten im Channel ${channel.name}!`);
            console.warn('Bitte gib dem Bot die "Nachrichten verwalten" Berechtigung oder lösche die Nachrichten manuell.');
            return false;
        }
        
        let messages;
        let deleted = 0;
        
        do {
            try {
                messages = await channel.messages.fetch({ limit: 100 });
                debugLog(`${messages.size} Nachrichten geladen`);
                
                if (messages.size > 0) {
                    const recentMessages = messages.filter(msg => {
                        const twoWeeksAgo = new Date();
                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                        return msg.createdAt > twoWeeksAgo;
                    });
                    
                    if (recentMessages.size > 0) {
                        debugLog(`Lösche ${recentMessages.size} neuere Nachrichten`);
                        await channel.bulkDelete(recentMessages, true);
                        deleted += recentMessages.size;
                    }

                    const olderMessages = messages.filter(msg => {
                        const twoWeeksAgo = new Date();
                        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                        return msg.createdAt <= twoWeeksAgo;
                    });
                    
                    if (olderMessages.size > 0) {
                        debugLog(`${olderMessages.size} Nachrichten sind älter als 14 Tage - können nicht gelöscht werden`);
                        console.log(`${olderMessages.size} Nachrichten sind älter als 14 Tage und können nicht gelöscht werden.`);
                    }
                }
            } catch (error) {
                debugLog(`Fehler beim Löschen der Nachrichten: ${error.message}`);
                console.error('Fehler beim Löschen der Nachrichten:', error);
                return false;
            }
        } while (messages.size >= 100 && messages.some(msg => {
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            return msg.createdAt > twoWeeksAgo;
        }));
        
        debugLog(`${deleted} Nachrichten wurden erfolgreich gelöscht`);
        console.log(`${deleted} Nachrichten wurden gelöscht.`);
        return true;
    } catch (error) {
        debugLog(`Fehler beim Löschen der Nachrichten: ${error.message}`);
        console.error('Fehler beim Löschen der Nachrichten:', error);
        return false;
    }
}

function setupHandlers(client) {
    client.once('ready', async () => {
        console.log(`Bot ist online als ${client.user.tag}`);
        debugLog(`Bot gestartet - Tag: ${client.user.tag}, ID: ${client.user.id}`);
        debugLog(`Debug-Modus: ${DEBUG ? 'AKTIV' : 'INAKTIV'}`);
        
        await registerCommands(client);
        debugLog('Slash-Commands wurden registriert');
        
        await setInitialBotStatus(client);
        debugLog('Initialer Bot-Status wurde gesetzt');

        cache.apiAvailable = true;
        
        if (!cache.initialized) {
            debugLog('Erstinitialisierung - Versuche Nachrichten zu löschen');
            const planChannel = client.channels.cache.get(PLAN_CHANNEL_ID);
            if (planChannel) {
                const success = await clearChannel(planChannel);
                if (success) {
                    debugLog('Bot-Initialisierung abgeschlossen: Nachrichten erfolgreich gelöscht');
                    console.log('Bot-Initialisierung abgeschlossen: Nachrichten gelöscht.');
                } else {
                    debugLog('Bot-Initialisierung abgeschlossen: Fehler beim Löschen der Nachrichten');
                    console.warn('Bot-Initialisierung abgeschlossen: Konnte Nachrichten nicht löschen.');
                }
                cache.initialized = true;
            } else {
                debugLog(`Plan-Channel nicht gefunden! Gesuchte ID: ${PLAN_CHANNEL_ID}`);
                console.error('Plan-Channel nicht gefunden!');
            }
        }
        
        if (!isMaintenanceModeActive()) {
            debugLog('Führe initialen Vertretungsplan-Update durch');
            await updatePlan(client);
        } else {
            console.log('Wartungsmodus aktiv - kein initiales Update');
            debugLog('Wartungsmodus aktiv - überspringe initialen Vertretungsplan-Update');
        }
        
        console.log(`Update-Intervall: ${INTERVALS.UPDATE_INTERVAL / 60000} Minuten`);
        console.log(`Prüf-Intervall: ${INTERVALS.CHECK_INTERVAL / 60000} Minuten`);
        debugLog(`Konfigurations-Details: Update alle ${INTERVALS.UPDATE_INTERVAL / 60000}min, Prüfung alle ${INTERVALS.CHECK_INTERVAL / 60000}min`);
        
        setInterval(async () => {
            if (!isMaintenanceModeActive()) {
                await updatePlan(client);
            } else {
                debugLog('Wartungsmodus aktiv - überspringe geplantes Update');
            }
        }, INTERVALS.UPDATE_INTERVAL);
        
        setInterval(async () => {
            if (!isMaintenanceModeActive()) {
                await checkPlanChanges(client);
            } else {
                debugLog('Wartungsmodus aktiv - überspringe geplante Änderungsprüfung');
            }
        }, INTERVALS.CHECK_INTERVAL);

        console.log('Sende Heartbeat an Status-API');
        fetch(`https://status.tobias-hudaff.de/api/push/pOYMx1up2g?status=up&msg=OK&ping=${Math.round(client.ws.ping)}`).catch(err => log.error(err));

        setInterval(function(){ 
            console.log('Sende Heartbeat an Status-API');
            fetch(`https://status.tobias-hudaff.de/api/push/pOYMx1up2g?status=up&msg=OK&ping=${Math.round(client.ws.ping)}`).catch(err => log.error(err));
        }, 60000);
    });
    
    client.on('interactionCreate', async interaction => {
        if (interaction.isCommand()) {
            debugLog(`Slash-Command empfangen: ${interaction.commandName} von ${interaction.user.tag} (${interaction.user.id})`);
            
            const { commandName } = interaction;
            
            const isTestCommand = ['test-plan', 'test-update', 'test-notification', 'test-holiday'].includes(commandName);
            
            if (isTestCommand && !DEBUG) {
                debugLog(`Test-Befehl ${commandName} wurde verweigert - Debug-Modus ist deaktiviert`);
                return interaction.reply({ 
                    content: '❌ Test-Befehle sind nur im Debug-Modus verfügbar. Der Debug-Modus ist derzeit deaktiviert.', 
                    ephemeral: true 
                });
            }
            
            if (!['maintenance', 'setup-role'].includes(interaction.commandName) && !isAuthorized(interaction.user.id, AUTHORIZED_USERS)) {
                debugLog(`Benutzer ${interaction.user.tag} ist nicht berechtigt, den Befehl ${interaction.commandName} auszuführen`);
                return interaction.reply({ 
                    content: '❌ Du bist nicht berechtigt, diesen Befehl auszuführen.', 
                    ephemeral: true 
                });
            }
            
            switch (commandName) {
                case 'test-plan':
                    await interaction.deferReply({ ephemeral: true });
                    await testPlanGeneration(interaction);
                    break;
                    
                case 'test-update':
                    const date = interaction.options.getString('datum');
                    
                    await interaction.deferReply({ ephemeral: true });
                    await testUpdateDetection(interaction, date);
                    break;
                    
                case 'test-notification':
                    await interaction.deferReply({ ephemeral: true });
                    await testNotification(interaction, client);
                    break;
                    
                case 'test-holiday':
                    const holidayDate = interaction.options.getString('datum');
                    await testHolidayMode(interaction, holidayDate);
                    break;
                    
                case 'force-update':
                    if (isMaintenanceModeActive()) {
                        await interaction.reply({
                            content: '⚠️ Vertretungsplan-Update nicht möglich: Der Bot befindet sich im Wartungsmodus.',
                            ephemeral: true
                        });
                        break;
                    }
                    
                    await interaction.reply({
                        content: '🔄 Erzwinge Update des Vertretungsplans...',
                        ephemeral: true
                    });
                    await updatePlan(client);
                    await interaction.editReply('✅ Update des Vertretungsplans abgeschlossen!');
                    break;
                    
                case 'clear-channel':
                    await interaction.reply({
                        content: '🧹 Versuche alle Nachrichten im Vertretungsplan-Channel zu löschen...',
                        ephemeral: true
                    });
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
                    if (!UPDATE_ROLE_ID) {
                        return interaction.reply({
                            content: '❌ Die UPDATE_ROLE_ID ist nicht in der .env-Datei konfiguriert.',
                            ephemeral: true
                        });
                    }
                    
                    await interaction.deferReply({ ephemeral: true });
                    
                    try {
                        let role = interaction.guild.roles.cache.get(UPDATE_ROLE_ID);
                        
                        if (role) {
                            await interaction.editReply(`✅ Die Rolle "${role.name}" (ID: ${role.id}) ist bereits eingerichtet.`);
                        } else {
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
                    
                case 'maintenance':
                    if (!interaction.member.permissions.has('Administrator')) {
                        debugLog(`Benutzer ${interaction.user.tag} hat keine Administrator-Rechte für den Wartungsmodus`);
                        return interaction.reply({ 
                            content: '❌ Du benötigst Administrator-Rechte, um den Wartungsmodus zu steuern.', 
                            ephemeral: true 
                        });
                    }
                    
                    try {
                        await interaction.deferReply({ ephemeral: true });
                        
                        if (isMaintenanceModeActive()) {
                            await disableMaintenanceMode(client);
                            await interaction.editReply(`✅ Wartungsmodus deaktiviert! Der Bot nimmt seine normalen Operationen wieder auf.`);
                            console.log(`Wartungsmodus deaktiviert von ${interaction.user.tag} (${interaction.user.id})`);
                        } else {
                            await enableMaintenanceMode(client);
                            await interaction.editReply(`✅ Wartungsmodus aktiviert! Der Bot verarbeitet keine automatischen Updates mehr und hat seinen Status auf "Wartungsmodus" geändert.`);
                            console.log(`Wartungsmodus aktiviert von ${interaction.user.tag} (${interaction.user.id})`);
                        }
                    } catch (error) {
                        console.error('Fehler beim Ändern des Wartungsmodus:', error);
                        await interaction.editReply('❌ Es ist ein Fehler beim Ändern des Wartungsmodus aufgetreten.');
                    }
                    break;

                case 'klassenbuch':
                    await interaction.deferReply({ ephemeral: true });
                    try {
                        const dateParam = interaction.options.getString('datum') || dateUtils.getPreviousDate().toISOString().split('T')[0];
                        let klassenbuchData = await getKlassenbuchData(dateParam);

                        debugLog(`Klassenbucheinträge für ${dateParam} abgerufen: ${klassenbuchData.length} Einträge`);

                        if (!klassenbuchData) {
                            await interaction.editReply('❌ Keine Klassenbucheinträge für das angegebene Datum gefunden.');
                            return;
                        }

                        const embed = createEmbed(dateParam, klassenbuchData);
                        await interaction.editReply({ embeds: [embed] });

                    } catch (error) {
                        console.error('Error in klassenbuch command:', error);
                        await interaction.editReply('❌ Es ist ein Fehler beim Abrufen der Klassenbucheinträge aufgetreten.');
                    }
                    break;
            }
        }
        
        if (interaction.isButton()) {
            debugLog(`Button-Interaction empfangen: ${interaction.customId} von ${interaction.user.tag} (${interaction.user.id})`);
            
            if (!UPDATE_ROLE_ID) {
                debugLog('Button-Interaktion fehlgeschlagen: UPDATE_ROLE_ID nicht konfiguriert');
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