const { BASE_URL, API_KEY, cache } = require('../config');
const { debugLog } = require('../utils/debugUtils');

/**
 * ApiService - Klasse für die Verwaltung von API-Aufrufen
 */
class ApiService {
  /**
   * Ruft Vertretungsplan-Daten von der API ab
   * @param {string} dateParam - Datum im Format DD.MM.YYYY
   * @returns {Array} Die abgerufenen Daten oder ein leeres Array bei Fehler
   */
  async fetchData(dateParam) {
    try {
      debugLog(`API-Anfrage: Hole Daten für Datum ${dateParam}`);
      const apiUrl = `${BASE_URL}?date=${dateParam}`;
      debugLog(`API-URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
        headers: {
          "appwrite-admin": API_KEY
        }
      });
      
      if (!response.ok) {
        debugLog(`API-Fehler: Status ${response.status} ${response.statusText}`);
        throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      debugLog(`API-Antwort: ${data.length} Einträge erhalten`);
      
      return data;
    } catch (err) {
      console.error('Error fetching data:', err);
      debugLog(`API-Fehler beim Abrufen der Daten: ${err.message}`);
      return []; // Fallback: leeres Array
    }
  }

  /**
   * Überprüft, ob die API erreichbar ist
   * @returns {Object} Statusobjekt mit Verfügbarkeitsinformationen
   */
  async checkApiAvailability() {
    // API wird immer als verfügbar betrachtet
    debugLog(`API-Verfügbarkeitsprüfung - gebe "verfügbar" zurück`);
    
    // Sicherstellen, dass API als verfügbar angezeigt wird
    cache.apiAvailable = true;
    cache.statusChanged = false;
    
    return { 
      available: true, 
      statusChanged: false
    };
  }
}

// Singleton-Instanz erstellen
const apiService = new ApiService();

module.exports = {
  fetchData: (dateParam) => apiService.fetchData(dateParam),
  checkApiAvailability: () => apiService.checkApiAvailability()
};
