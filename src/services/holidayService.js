const fs = require('fs');
const path = require('path');
const { debugLog } = require('../utils/debugUtils');
const { cache } = require('../config');

class HolidayService {
    constructor() {
        this.baseUrl = 'https://ferien-api.de/api/v1/holidays/NI';
    }

    /**
     * Holt die Feriendaten für das aktuelle Jahr
     */
    async fetchHolidays() {
        const currentYear = new Date().getFullYear();

        // Wenn die Daten bereits im Cache sind, gib sie zurück
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
                
                // Speichere im Cache
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

                // Speichere im Cache
                cache.holidays = holidays;
                cache.lastHolidayUpdate = new Date();
                return holidays;
            }
        }
    }

    /**
     * Prüft ob ein bestimmtes Datum in den Ferien liegt
     * @param {Date} date - Das zu prüfende Datum
     * @returns {Object|null} Ferienobjekt wenn Ferien sind, sonst null
     */
    isHoliday(date) {
        if (!cache.holidays) return null;
        
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        
        return cache.holidays.find(holiday => {
            const start = new Date(holiday.start);
            const end = new Date(holiday.end);
            return date >= start && date <= end;
        });
    }

    /**
     * Aktualisiert die Feriendaten wenn nötig
     */
    async updateIfNeeded() {
        const now = new Date();
        
        // Wenn noch keine Daten geladen wurden oder der letzte Update älter als 24h ist
        if (!cache.holidays || !cache.lastHolidayUpdate || 
            (now - cache.lastHolidayUpdate) > 24 * 60 * 60 * 1000) {
            debugLog('Feriendaten müssen aktualisiert werden');
            await this.fetchHolidays();
        }
    }
}

// Singleton-Instanz erstellen
const holidayService = new HolidayService();

module.exports = {
    fetchHolidays: () => holidayService.fetchHolidays(),
    isHoliday: (date) => holidayService.isHoliday(date),
    updateIfNeeded: () => holidayService.updateIfNeeded()
};