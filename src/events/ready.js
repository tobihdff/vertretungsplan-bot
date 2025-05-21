const { scheduleJobs } = require('../jobs/scheduler');
const { cache, DEBUG } = require('../config');
const { debugLog } = require('../utils/debugUtils');
const { setInitialBotStatus } = require('../utils/statusUtils');
const { fetchHolidays } = require('../services/holidayService');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        try {
            console.log(`Bot ist eingeloggt als ${client.user.tag}`);
            debugLog(`Bot-Start: Client ready event ausgelöst (${client.user.tag})`);
            
            if (!cache.data) {
                cache.data = {};
            }
            if (!cache.messages) {
                cache.messages = {};
            }
            
            await setInitialBotStatus(client);
            debugLog('Initialer Bot-Status wurde gesetzt');
            
            debugLog('Lade initiale Feriendaten');
            await fetchHolidays();
            
            scheduleJobs(client);
            
            console.log('Bot ist bereit!');
            debugLog('Bot-Initialisierung abgeschlossen');
        } catch (error) {
            console.error('Fehler im Ready-Event:', error);
            debugLog(`Fehler im Ready-Event: ${error.message}`);
        }
    },
};
