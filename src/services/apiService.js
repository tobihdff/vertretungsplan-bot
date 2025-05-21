const { BASE_URL, API_KEY, cache } = require('../config');
const { debugLog } = require('../utils/debugUtils');
class ApiService {
  async fetchVertretungsplan(dateParam) {
    try {
      debugLog(`API-Anfrage: Hole Daten für Datum ${dateParam}`);
      const apiUrl = `${BASE_URL}/vertretungsplan?date=${dateParam}`;
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
      return [];
    }
  }

  async fetchKlassenbuch(dateParam) {
    try {
      debugLog(`API-Anfrage: Hole Daten für Klassenbuch ${dateParam}`);
      const apiUrl = `${BASE_URL}/klassenbuch?date=${dateParam}`;
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
      return [];
    }
  }

  async checkApiAvailability() {
    debugLog(`API-Verfügbarkeitsprüfung - gebe "verfügbar" zurück`);
    
    cache.apiAvailable = true;
    cache.statusChanged = false;
    
    return { 
      available: true, 
      statusChanged: false
    };
  }
}

const apiService = new ApiService();

module.exports = {
  fetchVertretungsplan: (dateParam) => apiService.fetchVertretungsplan(dateParam),
  checkApiAvailability: () => apiService.checkApiAvailability(),
  fetchKlassenbuch: (dateParam) => apiService.fetchKlassenbuch(dateParam),
};
