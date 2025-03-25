const { scheduleJobs } = require('../jobs/scheduler');
const { cache, DEBUG } = require('../config');
const { debugLog } = require('../utils/debugUtils');
const { setInitialBotStatus } = require('../utils/statusUtils');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            console.log(`Bot ist eingeloggt als ${client.user.tag}`);
            debugLog(`Bot-Start: Client ready event ausgelöst (${client.user.tag})`);
            
            // Cache initialisieren, wenn noch nicht vorhanden
            if (!cache.data) {
                cache.data = {};
            }
            if (!cache.messages) {
                cache.messages = {};
            }
            
            // Initialen Status setzen
            await setInitialBotStatus(client);
            
            // Jobs planen
            scheduleJobs(client);
            
            console.log('Bot ist bereit!');
        } catch (error) {
            console.error('Fehler im Ready-Event:', error);
            debugLog(`Fehler im Ready-Event: ${error.message}`);
        }
    },
};
