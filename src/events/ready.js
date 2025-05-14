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
            
            // Cache initialisieren, wenn noch nicht vorhanden
            if (!cache.data) {
                cache.data = {};
            }
            if (!cache.messages) {
                cache.messages = {};
            }
            
            // Initialen Bot-Status setzen
            await setInitialBotStatus(client);
            debugLog('Initialer Bot-Status wurde gesetzt');
            
            // Feriendaten initial laden
            debugLog('Lade initiale Feriendaten');
            await fetchHolidays();
            
            // Jobs planen
            scheduleJobs(client);
            
            // Plane täglichen Ferien-Update um Mitternacht
            setInterval(async () => {
                const now = new Date();
                if (now.getHours() === 0 && now.getMinutes() === 0) {
                    debugLog('Führe täglichen Ferien-Update durch');
                    await fetchHolidays();
                }
            }, 60 * 1000); // Prüfe jede Minute
            
            console.log('Bot ist bereit!');
            debugLog('Bot-Initialisierung abgeschlossen');
        } catch (error) {
            console.error('Fehler im Ready-Event:', error);
            debugLog(`Fehler im Ready-Event: ${error.message}`);
        }
    },
};
