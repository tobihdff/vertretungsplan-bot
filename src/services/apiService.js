const { BASE_URL, API_KEY, cache, DEBUG } = require('../config');
const { debugLog } = require('../utils/debugUtils');

/**
 * Ruft Vertretungsplan-Daten von der API ab
 */
async function fetchData(dateParam) {
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
        
        // API ist erreichbar
        if (!cache.apiAvailable) {
            console.log('API ist wieder erreichbar!');
            cache.apiAvailable = true;
        }
        
        const data = await response.json();
        debugLog(`API-Antwort: ${data.length} Einträge erhalten`);
        
        return data;
    } catch (err) {
        console.error('Error fetching data:', err);
        debugLog(`API-Fehler beim Abrufen der Daten: ${err.message}`);
        // API ist nicht erreichbar
        cache.apiAvailable = false;
        return []; // Fallback: leeres Array
    }
}

/**
 * Überprüft, ob die API erreichbar ist
 * 
 * Diese Funktion verwendet einen GET-Request anstelle eines HEAD-Requests,
 * da manche APIs HEAD-Requests nicht richtig unterstützen.
 */
async function checkApiAvailability() {
    try {
        // Aktuelles Datum für den API-Aufruf verwenden
        const today = new Date();
        const dateParam = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
        const apiUrl = `${BASE_URL}?date=${dateParam}`;
        
        debugLog(`Überprüfe API-Erreichbarkeit: ${apiUrl}`);
        console.log(`Überprüfe API-Erreichbarkeit: ${apiUrl}`);
        
        // Wir verwenden denselben Request-Typ wie bei fetchData, aber mit einem kurzen Timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 Sekunden Timeout
        
        const response = await fetch(apiUrl, {
            headers: {
                "appwrite-admin": API_KEY
            },
            signal: controller.signal
        });
        
        // Timeout-Timer löschen
        clearTimeout(timeoutId);
        
        // 2xx Statuscodes bedeuten, dass die API erreichbar ist
        const isAvailable = response.ok;
        
        // Nur wenn sich der Status ändert, loggen wir eine Nachricht
        const statusChanged = cache.apiAvailable !== isAvailable;
        if (isAvailable) {
            debugLog(`API-Verfügbarkeit: OK - Status ${response.status}`);
            console.log('✅ API ist erreichbar');
        } else {
            debugLog(`API-Verfügbarkeit: Fehler - Status ${response.status} ${response.statusText}`);
            console.log(`❌ API ist nicht erreichbar - Status: ${response.status} ${response.statusText}`);
        }
        
        cache.apiAvailable = isAvailable;
        return { available: isAvailable, statusChanged };
    } catch (err) {
        // Spezifischere Fehlerbehandlung
        let errorMessage = '';
        
        if (err.name === 'AbortError') {
            errorMessage = 'Timeout bei API-Anfrage - möglicherweise ist der Server überlastet';
            debugLog(`API-Timeout: Abbruch nach 5 Sekunden`);
        } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
            errorMessage = `Verbindung zum API-Server nicht möglich: ${err.message}`;
            debugLog(`API-Verbindungsfehler: ${err.message}`);
        } else {
            errorMessage = `Unerwarteter Fehler: ${err.message}`;
            debugLog(`API-Unerwarteter Fehler: ${err.message}`);
        }
        
        const statusChanged = cache.apiAvailable !== false;
        cache.apiAvailable = false;
        console.error(`API Availability Check Failed: ${errorMessage}`);
        return { available: false, statusChanged };
    }
}

module.exports = {
    fetchData,
    checkApiAvailability
};
