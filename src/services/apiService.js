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
            // Erhöhen des Fehlerzählers bei Fehlern
            increaseErrorCount();
            throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        
        // Erfolgreicher Abruf - Fehlerzähler zurücksetzen
        resetErrorCount();
        
        // Nur Status ändern, wenn wir zuvor als nichtverfügbar galten
        if (!cache.apiAvailable) {
            // Confirmations erhöhen
            errorState.confirmations++;
            
            if (errorState.confirmations >= CONFIRMATION_COUNT) {
                debugLog(`API ist erreichbar - Bestätigung #${errorState.confirmations}`);
                console.log('API ist wieder erreichbar!');
                cache.apiAvailable = true;
                cache.statusChanged = true;
                errorState.confirmations = 0;  // Zurücksetzen nach erfolgreicher Statusänderung
            } else {
                debugLog(`API scheint erreichbar - Warte auf Bestätigung (${errorState.confirmations}/${CONFIRMATION_COUNT})`);
            }
        } else {
            // Wenn wir bereits als verfügbar galten, Bestätigungszähler zurücksetzen
            errorState.confirmations = 0;
        }
        
        const data = await response.json();
        debugLog(`API-Antwort: ${data.length} Einträge erhalten`);
        
        return data;
    } catch (err) {
        console.error('Error fetching data:', err);
        debugLog(`API-Fehler beim Abrufen der Daten: ${err.message}`);
        
        // API Verfügbarkeit wird nur geändert, wenn Fehlerschwelle überschritten
        if (errorState.errorCount >= ERROR_THRESHOLD && cache.apiAvailable) {
            debugLog(`Fehlerschwelle überschritten (${errorState.errorCount}/${ERROR_THRESHOLD}) - Markiere API als nicht verfügbar`);
            cache.apiAvailable = false;
            cache.statusChanged = true;
            errorState.confirmations = 0;  // Bestätigungszähler zurücksetzen
        }
        
        return []; // Fallback: leeres Array
    }
}

/**
 * Erhöht den Fehlerzähler und aktualisiert den letzten Fehlerzeitpunkt
 */
function increaseErrorCount() {
    errorState.errorCount++;
    errorState.lastErrorTime = Date.now();
    debugLog(`Fehlerzähler erhöht auf ${errorState.errorCount}/${ERROR_THRESHOLD}`);
}

/**
 * Setzt den Fehlerzähler zurück
 */
function resetErrorCount() {
    if (errorState.errorCount > 0) {
        debugLog(`Fehlerzähler zurückgesetzt (war: ${errorState.errorCount})`);
        errorState.errorCount = 0;
        errorState.lastErrorTime = null;
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
        
        // Bei erfolgreicher Anfrage den Fehlerzähler zurücksetzen
        if (isAvailable) {
            resetErrorCount();
            
            // Wenn wir zuvor nicht verfügbar waren, Confirmations erhöhen
            if (!cache.apiAvailable) {
                errorState.confirmations++;
                debugLog(`API scheint erreichbar - Bestätigung: ${errorState.confirmations}/${CONFIRMATION_COUNT}`);
                
                // Nur Status ändern, wenn genügend Bestätigungen vorliegen
                if (errorState.confirmations >= CONFIRMATION_COUNT) {
                    debugLog(`API-Verfügbarkeit bestätigt nach ${CONFIRMATION_COUNT} Prüfungen`);
                    var statusChanged = true;
                    errorState.confirmations = 0;  // Zurücksetzen
                } else {
                    // Noch nicht genug Bestätigungen
                    var statusChanged = false;
                }
            } else {
                // API war bereits als verfügbar markiert
                var statusChanged = false;
                errorState.confirmations = 0;  // Confirmations zurücksetzen
            }
        } else {
            // Bei Fehler den Fehlerzähler erhöhen
            increaseErrorCount();
            
            // Nur wenn Fehlerschwelle überschritten ist UND wir vorher verfügbar waren, Status ändern
            if (errorState.errorCount >= ERROR_THRESHOLD && cache.apiAvailable) {
                debugLog(`Fehlerschwelle überschritten (${errorState.errorCount}/${ERROR_THRESHOLD})`);
                var statusChanged = true;
                errorState.confirmations = 0;  // Confirmations zurücksetzen
            } else {
                // Noch nicht genügend Fehler für Statusänderung
                var statusChanged = false;
                if (cache.apiAvailable) {
                    debugLog(`API-Fehler ${errorState.errorCount}/${ERROR_THRESHOLD} - Noch keine Statusänderung`);
                }
            }
        }
        
        // Statusänderungslogik
        if (statusChanged) {
            if (isAvailable) {
                debugLog(`API-Verfügbarkeit: OK - Status ${response.status} (Status-Änderung erkannt)`);
                console.log('✅ API ist wieder erreichbar');
                cache.apiAvailable = true;
            } else {
                debugLog(`API-Verfügbarkeit: Fehler - Status ${response.status} ${response.statusText} (Status-Änderung erkannt)`);
                console.log(`❌ API ist nicht mehr erreichbar - Status: ${response.status} ${response.statusText}`);
                cache.apiAvailable = false;
            }
            cache.statusChanged = true;
        } else {
            debugLog(`API-Verfügbarkeit: ${isAvailable ? 'OK' : 'Fehler'} - Status ${response.status} (Keine Status-Änderung)`);
            cache.statusChanged = false;
        }
        
        return { 
            available: isAvailable, 
            statusChanged: statusChanged,
            errorCount: errorState.errorCount,
            confirmationCount: errorState.confirmations
        };
    } catch (err) {
        // Fehlerzähler erhöhen
        increaseErrorCount();
        
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
        
        // Nur Status ändern, wenn Fehlerschwelle überschritten und vorher verfügbar
        let statusChanged = false;
        if (errorState.errorCount >= ERROR_THRESHOLD && cache.apiAvailable) {
            statusChanged = true;
            cache.apiAvailable = false;
            cache.statusChanged = true;
            console.error(`API nicht mehr erreichbar: ${errorMessage}`);
        } else {
            if (cache.apiAvailable) {
                debugLog(`API-Fehler ${errorState.errorCount}/${ERROR_THRESHOLD} - Noch keine Statusänderung`);
            } else {
                debugLog(`API weiterhin nicht erreichbar: ${errorMessage}`);
            }
        }
        
        return { 
            available: false, 
            statusChanged: statusChanged,
            errorCount: errorState.errorCount,
            confirmationCount: errorState.confirmations
        };
    }
}

module.exports = {
    fetchData,
    checkApiAvailability,
    ERROR_THRESHOLD,
    CONFIRMATION_COUNT
};
