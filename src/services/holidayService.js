const fs = require('fs');
const path = require('path');
const { debugLog } = require('../utils/debugUtils');
const { cache } = require('../config');

class HolidayService {
    async fetchHolidays() {
        const currentYear = new Date().getFullYear();

        if (cache.holidays) {
            debugLog(`Feriendaten für ${currentYear} bereits im Cache`);
            return cache.holidays;
        }
        
        const holidaysPath = path.join(__dirname, `../data/holidays/${currentYear}.json`);
        debugLog(`Lade Feriendaten aus: ${holidaysPath}`);
        
        try {
            const holidaysData = fs.readFileSync(holidaysPath, 'utf8');
            const holidays = JSON.parse(holidaysData);

            holidays.forEach(h => {
                const start = new Date(h.start);
                const end = new Date(h.end);
                
                h.start = start.toISOString();
                h.end = end.toISOString();
                

                h.isSingleDay = start.toJSON().split("T")[0] === end.toJSON().split("T")[0];
            });

            debugLog(`${holidays.length} Ferieneinträge geladen`);
            holidays.forEach(h => debugLog(`Geladener Eintrag: ${h.name} (${h.start} - ${h.end}) ${h.isSingleDay ? '(Einzelner Tag)' : ''}`));

            cache.holidays = holidays;
            cache.lastHolidayUpdate = new Date();
            return holidays;
        } catch (err) {
            console.error('Fehler beim Laden der Feriendaten:', err);
            debugLog(`Fehler beim Laden der Feriendaten: ${err.message}`);
            return null;
        }
    }

    isHoliday(date) {
        if (!cache.holidays) return null;
        
        const checkDate = new Date(date);
        checkDate.setUTCHours(12, 0, 0, 0);
        
        debugLog(`Prüfe Datum: ${checkDate.toISOString()}`);
        
        const holiday = cache.holidays.find(holiday => {
            const start = new Date(holiday.start);
            const end = new Date(holiday.end);
            
            const isInRange = checkDate >= start && checkDate <= end;
            
            debugLog(`Vergleiche mit ${holiday.isSingleDay ? 'Feiertag' : 'Ferien'}: ${holiday.name}`);
            debugLog(`Start: ${start.toISOString()}`);
            debugLog(`Prüfdatum: ${checkDate.toISOString()}`);
            debugLog(`Ende: ${end.toISOString()}`);
            debugLog(`${start.getTime()} <= ${checkDate.getTime()} <= ${end.getTime()} = ${isInRange}`);
            
            return isInRange;
        });

        debugLog(holiday ? `Gefunden: ${holiday.name} (${holiday.isSingleDay ? 'Feiertag' : 'Ferien'})` : 'Kein freier Tag gefunden');
        return holiday || false;
    }

    async updateIfNeeded() {
        if (!cache.holidays) {
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