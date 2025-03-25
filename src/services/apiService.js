const { BASE_URL, API_KEY, cache, DEBUG } = require('../config');
const { debugLog } = require('../utils/debugUtils');

// Neue Konstanten für Fehlerbehandlung
const ERROR_THRESHOLD = 3;  // Anzahl der Fehler, bevor API als nicht erreichbar gilt
const CONFIRMATION_COUNT = 2;  // Anzahl der Bestätigungen, bevor Status geändert wird

// Cache für Fehlerbehandlung (wird in cache nicht persistiert)
const errorState = {
    errorCount: 0,       // Aktueller Fehlerzähler
    confirmations: 0,    // Anzahl der Bestätigungen eines Status
    lastErrorTime: null  // Zeitpunkt des letzten Fehlers
};

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
            // Status-Funktionalität deaktiviert
            // increaseErrorCount();
            throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        
        // Status-Funktionalität deaktiviert
        // resetErrorCount();
        
        // Status-Änderungslogik deaktiviert
        /*
        if (!cache.apiAvailable) {
            errorState.confirmations++;
            
            if (errorState.confirmations >= CONFIRMATION_COUNT) {
                debugLog(`API ist erreichbar - Bestätigung #${errorState.confirmations}`);
                console.log('API ist wieder erreichbar!');
                cache.apiAvailable = true;
                cache.statusChanged = true;
                errorState.confirmations = 0;
            } else {
                debugLog(`API scheint erreichbar - Warte auf Bestätigung (${errorState.confirmations}/${CONFIRMATION_COUNT})`);
            }
        } else {
            errorState.confirmations = 0;
        }
        */
        
        const data = await response.json();
        debugLog(`API-Antwort: ${data.length} Einträge erhalten`);
        
        return data;
    } catch (err) {
        console.error('Error fetching data:', err);
        debugLog(`API-Fehler beim Abrufen der Daten: ${err.message}`);
        
        // Status-Änderungslogik deaktiviert
        /*
        if (errorState.errorCount >= ERROR_THRESHOLD && cache.apiAvailable) {
            debugLog(`Fehlerschwelle überschritten (${errorState.errorCount}/${ERROR_THRESHOLD}) - Markiere API als nicht verfügbar`);
            cache.apiAvailable = false;
            cache.statusChanged = true;
            errorState.confirmations = 0;
        }
        */
        
        return []; // Fallback: leeres Array
    }
}

/**
 * Erhöht den Fehlerzähler und aktualisiert den letzten Fehlerzeitpunkt
 * (Temporär deaktiviert)
 */
function increaseErrorCount() {
    // Funktion temporär deaktiviert
    /*
    errorState.errorCount++;
    errorState.lastErrorTime = Date.now();
    debugLog(`Fehlerzähler erhöht auf ${errorState.errorCount}/${ERROR_THRESHOLD}`);
    */
}

/**
 * Setzt den Fehlerzähler zurück
 * (Temporär deaktiviert)
 */
function resetErrorCount() {
    // Funktion temporär deaktiviert
    /*
    if (errorState.errorCount > 0) {
        debugLog(`Fehlerzähler zurückgesetzt (war: ${errorState.errorCount})`);
        errorState.errorCount = 0;
        errorState.lastErrorTime = null;
    }
    */
}

/**
 * Überprüft, ob die API erreichbar ist
 * (Temporär deaktiviert - gibt immer "verfügbar" zurück)
 */
async function checkApiAvailability() {
    // Temporär deaktiviert - gibt immer "verfügbar" zurück
    debugLog(`API-Verfügbarkeitsprüfung temporär deaktiviert - gebe "verfügbar" zurück`);
    
    // Sicherstellen, dass API als verfügbar angezeigt wird
    cache.apiAvailable = true;
    cache.statusChanged = false;
    
    return { 
        available: true, 
        statusChanged: false,
        errorCount: 0,
        confirmationCount: 0
    };
}

module.exports = {
    fetchData,
    checkApiAvailability,
    ERROR_THRESHOLD,
    CONFIRMATION_COUNT
};
