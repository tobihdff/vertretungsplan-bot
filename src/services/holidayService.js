const fs = require('fs');
const path = require('path');
const { debugLog } = require('../utils/debugUtils');
const { cache } = require('../config');

class HolidayService {
    constructor() {
        this.baseUrl = 'https://ferien-api.de/api/v1/holidays/NI';
    }

    async fetchHolidays() {
        const currentYear = new Date().getFullYear();

        if (cache.holidays && cache.lastHolidayUpdate) {
            const lastUpdateYear = cache.lastHolidayUpdate.getFullYear();
            if (lastUpdateYear === currentYear) {
                debugLog(`Feriendaten für ${currentYear} bereits im Cache`);
                return cache.holidays;
            }
        } else {
            try {
                debugLog(`Hole Feriendaten für ${currentYear} von der API`);
                const response = await fetch(`${this.baseUrl}/${currentYear}`);
                if (!response.ok) {
                    throw new Error(`Ferien-API Fehler: ${response.status} ${response.statusText}`);
                }
                
                const holidays = await response.json();
                debugLog(`${holidays.length} Ferieneinträge geladen`);
                
                cache.holidays = holidays;
                cache.lastHolidayUpdate = new Date();
                
                return holidays;
            } catch (err) {
                console.error('Fehler beim Abrufen der Feriendaten:', err);
                debugLog(`Fehler beim Abrufen der Feriendaten: ${err.message}`);

                const holidaysPath = path.join(__dirname, `../data/holidays/${currentYear}.json`);
                const holidaysData = fs.readFileSync(holidaysPath, 'utf8');
                const holidays = JSON.parse(holidaysData);

                debugLog(`Fallback: Lade Feriendaten von ${holidaysPath}`);
                debugLog(`Fallback: ${holidays.length} Ferieneinträge geladen`);

                cache.holidays = holidays;
                cache.lastHolidayUpdate = new Date();
                return holidays;
            }
        }
    }

    isHoliday(date) {
        if (!cache.holidays) return null;
        
        const dateStr = date.toISOString().split('T')[0];
        
        return cache.holidays.find(holiday => {
            const start = new Date(holiday.start);
            const end = new Date(holiday.end);
            return date >= start && date <= end;
        });
    }

    async updateIfNeeded() {
        const now = new Date();
        
        if (!cache.holidays || !cache.lastHolidayUpdate || 
            (now - cache.lastHolidayUpdate) > 24 * 60 * 60 * 1000) {
            debugLog('Feriendaten müssen aktualisiert werden');
            await this.fetchHolidays();
        }
    }
}

const holidayService = new HolidayService();

module.exports = {
    fetchHolidays: () => holidayService.fetchHolidays(),
    isHoliday: (date) => holidayService.isHoliday(date),
    updateIfNeeded: () => holidayService.updateIfNeeded()
};