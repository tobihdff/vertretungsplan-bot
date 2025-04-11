const { BASE_URL, API_KEY, cache } = require('../config');
const { debugLog } = require('../utils/debugUtils');

/**
 * ApiService - Optimierte Klasse für die Verwaltung von API-Aufrufen
 * mit verbessertem Caching, Fehlerbehandlung und Netzwerk-Timeout
 */
class ApiService {
  constructor() {
    this.requestCache = new Map();
    this.retryDelays = [1000, 3000, 5000]; // Exponentielles Backoff für Wiederholungsversuche
    this.timeout = 8000; // 8 Sekunden Timeout für API-Anfragen
    this.pendingRequests = new Map(); // Verhindert doppelte Anfragen für den gleichen Endpunkt
    this.lastSuccessfulRequest = 0;
    
    // Regelmäßige Cache-Bereinigung
    setInterval(() => this.cleanupCache(), 30 * 60 * 1000); // Alle 30 Minuten
  }
  
  /**
   * Cache-Eintrag für ein Datum abrufen
   * @param {string} dateParam - Datum im Format DD.MM.YYYY
   * @returns {Object|null} Gecachte Daten oder null
   */
  getCachedData(dateParam) {
    const cacheEntry = this.requestCache.get(dateParam);
    if (!cacheEntry) return null;
    
    const now = Date.now();
    const { data, timestamp, expiry } = cacheEntry;
    
    // Cache für aktuelle Daten: 5 Minuten
    // Cache für ältere Daten (Vergangene Tage): 1 Stunde
    if (now - timestamp < expiry) {
      debugLog(`Cache-Treffer für Datum ${dateParam}`);
      return data;
    }
    
    return null;
  }
  
  /**
   * Daten im Cache speichern
   * @param {string} dateParam - Datum im Format DD.MM.YYYY
   * @param {Array} data - Die zu speichernden Daten
   */
  setCacheData(dateParam, data) {
    const now = Date.now();
    const today = new Date().toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'});
    const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', year: 'numeric'});
    
    // Dynamisches Caching:
    // - Aktuelle/zukünftige Tage: 5 Minuten Cache
    // - Vergangene Tage: 1 Stunde Cache (da sich kaum ändert)
    const expiry = (dateParam === today || dateParam === tomorrow) 
      ? 5 * 60 * 1000  // 5 Minuten für aktuelle Tage
      : 60 * 60 * 1000; // 1 Stunde für vergangene Tage
      
    this.requestCache.set(dateParam, {
      data,
      timestamp: now,
      expiry
    });
    
    debugLog(`Cache-Eintrag für Datum ${dateParam} erstellt (Ablauf: ${expiry/1000}s)`);
  }
  
  /**
   * Alte Cache-Einträge entfernen
   */
  cleanupCache() {
    const now = Date.now();
    let entriesRemoved = 0;
    
    for (const [key, entry] of this.requestCache.entries()) {
      if (now - entry.timestamp >= entry.expiry) {
        this.requestCache.delete(key);
        entriesRemoved++;
      }
    }
    
    if (entriesRemoved > 0) {
      debugLog(`Cache-Bereinigung: ${entriesRemoved} abgelaufene Einträge entfernt`);
    }
  }

  /**
   * Ruft Vertretungsplan-Daten von der API ab mit optimiertem Caching
   * und intelligenter Fehlerbehandlung
   * @param {string} dateParam - Datum im Format DD.MM.YYYY
   * @param {number} retryCount - Aktuelle Anzahl der Wiederholungsversuche
   * @returns {Array} Die abgerufenen Daten oder ein leeres Array bei Fehler
   */
  async fetchData(dateParam, retryCount = 0) {
    try {
      // Cache-Prüfung
      const cachedData = this.getCachedData(dateParam);
      if (cachedData) return cachedData;
      
      // Doppelte gleichzeitige Anfragen verhindern
      const requestKey = `fetch_${dateParam}`;
      if (this.pendingRequests.has(requestKey)) {
        debugLog(`Wartende Anfrage für ${dateParam} erkannt, verwende existierende Promise`);
        return this.pendingRequests.get(requestKey);
      }
      
      // Neue Anfrage erstellen mit Timeout
      const requestPromise = this._executeRequest(dateParam, retryCount);
      this.pendingRequests.set(requestKey, requestPromise);
      
      // Nach Abschluss aus pendingRequests entfernen
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
      
      return requestPromise;
    } catch (err) {
      console.error('Error in fetchData:', err);
      debugLog(`API-Fehler beim Abrufen der Daten für ${dateParam}: ${err.message}`);
      return []; // Fallback: leeres Array
    }
  }
  
  /**
   * Führt die eigentliche API-Anfrage aus mit Timeout und Retry-Logik
   * @param {string} dateParam - Datum im Format DD.MM.YYYY
   * @param {number} retryCount - Aktuelle Anzahl der Wiederholungsversuche
   * @returns {Promise<Array>} Die abgerufenen Daten
   * @private
   */
  async _executeRequest(dateParam, retryCount) {
    return new Promise(async (resolve, reject) => {
      // Timeout-Behandlung
      const timeoutId = setTimeout(() => {
        debugLog(`API-Timeout für Datum ${dateParam} nach ${this.timeout}ms`);
        reject(new Error(`API request timeout after ${this.timeout}ms`));
      }, this.timeout);
      
      try {
        debugLog(`API-Anfrage: Hole Daten für Datum ${dateParam}`);
        const apiUrl = `${BASE_URL}?date=${dateParam}`;
        
        const controller = new AbortController();
        const { signal } = controller;
        
        // Timeout für fetch selbst
        setTimeout(() => controller.abort(), this.timeout);
        
        const response = await fetch(apiUrl, {
          headers: {
            "appwrite-admin": API_KEY,
            "Accept": "application/json",
            "Connection": "close" // Vermeidet hängenbleibende Verbindungen
          },
          signal
        });
        
        // Timeout abbrechen, da Antwort erhalten
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          debugLog(`API-Fehler: Status ${response.status} ${response.statusText}`);
          throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        debugLog(`API-Antwort: ${data.length} Einträge erhalten für ${dateParam}`);
        
        // Erfolgreiche Anfrage registrieren
        this.lastSuccessfulRequest = Date.now();
        cache.apiAvailable = true;
        
        // Im Cache speichern
        this.setCacheData(dateParam, data);
        
        resolve(data);
      } catch (err) {
        // Timeout abbrechen
        clearTimeout(timeoutId);
        
        // AbortError behandeln
        if (err.name === 'AbortError') {
          debugLog(`API-Anfrage für ${dateParam} abgebrochen (Timeout)`);
          
          // API-Status aktualisieren wenn mehrere Timeouts auftreten
          const now = Date.now();
          if (now - this.lastSuccessfulRequest > 60000) {
            cache.apiAvailable = false;
            cache.statusChanged = true;
          }
          
          resolve([]); // Leeres Array zurückgeben
          return;
        }
        
        debugLog(`API-Fehler für ${dateParam}: ${err.message}`);
        console.error(`API error for ${dateParam}:`, err);
        
        // Wiederholungslogik
        if (retryCount < this.retryDelays.length) {
          const delay = this.retryDelays[retryCount];
          debugLog(`Wiederhole API-Anfrage für ${dateParam} in ${delay}ms (Versuch ${retryCount + 1})`);
          
          setTimeout(async () => {
            try {
              const retryData = await this.fetchData(dateParam, retryCount + 1);
              resolve(retryData);
            } catch (retryErr) {
              resolve([]); // Nach allen Wiederholungen leeres Array zurückgeben
            }
          }, delay);
        } else {
          // API als nicht verfügbar markieren nach mehreren Fehlern
          cache.apiAvailable = false;
          cache.statusChanged = true;
          
          resolve([]);
        }
      }
    });
  }

  /**
   * Überprüft, ob die API erreichbar ist mit verbesserter Diagnose
   * @returns {Object} Statusobjekt mit Verfügbarkeitsinformationen
   */
  async checkApiAvailability() {
    try {
      debugLog(`API-Verfügbarkeitsprüfung gestartet`);
      
      const controller = new AbortController();
      const { signal } = controller;
      
      // Kurzes Timeout für schnelles Feedback
      setTimeout(() => controller.abort(), 3000);
      
      // Einfache Ping-Anfrage ohne große Datenmengen
      const response = await fetch(`${BASE_URL}?check=1`, {
        headers: {
          "appwrite-admin": API_KEY,
          "Cache-Control": "no-cache",
          "Pragma": "no-cache"
        },
        signal
      });
      
      const wasUnavailable = !cache.apiAvailable;
      const isNowAvailable = response.ok;
      
      cache.apiAvailable = isNowAvailable;
      cache.statusChanged = wasUnavailable !== isNowAvailable;
      
      if (isNowAvailable) {
        this.lastSuccessfulRequest = Date.now();
      }
      
      debugLog(`API-Verfügbarkeitsprüfung: ${isNowAvailable ? 'verfügbar' : 'nicht verfügbar'} (Statusänderung: ${cache.statusChanged})`);
      
      return { 
        available: isNowAvailable, 
        statusChanged: cache.statusChanged,
        statusCode: response.status
      };
    } catch (err) {
      debugLog(`API-Verfügbarkeitsprüfung fehlgeschlagen: ${err.message}`);
      
      const wasAvailable = cache.apiAvailable;
      cache.apiAvailable = false;
      cache.statusChanged = wasAvailable !== false;
      
      return { 
        available: false, 
        statusChanged: cache.statusChanged,
        error: err.message 
      };
    }
  }
}

// Singleton-Instanz erstellen
const apiService = new ApiService();

module.exports = {
  fetchData: (dateParam) => apiService.fetchData(dateParam),
  checkApiAvailability: () => apiService.checkApiAvailability(),
  // Neue Hilfsfunktionen hinzufügen
  getCachedData: (dateParam) => apiService.getCachedData(dateParam),
  clearCache: () => apiService.requestCache.clear()
};
