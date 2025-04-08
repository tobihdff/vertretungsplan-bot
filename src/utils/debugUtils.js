const fs = require('fs');
const path = require('path');
const { DEBUG } = require('../config');

// Konstanten für Log-Pfade
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

// Log-Level Definition (in Reihenfolge steigender Ausführlichkeit)
const LOG_LEVELS = {
    ERROR: 0,
    INFO: 1,
    DEBUG: 2
};

// Aktuelles Log-Level, standardmäßig auf INFO
let CURRENT_LOG_LEVEL = LOG_LEVELS.INFO;

// Debug-Mode aus Konfiguration, unabhängig vom Log-Level
const DEBUG_MODE = DEBUG;

// Stelle sicher, dass der logs-Ordner existiert
try {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
        console.log('Logs-Verzeichnis erstellt:', LOG_DIR);
    }
} catch (err) {
    console.error('Fehler beim Erstellen des Log-Verzeichnisses:', err);
}

/**
 * Schreibt eine Nachricht in die Log-Datei
 * @param {string} level - Log-Level (INFO, DEBUG, ERROR)
 * @param {string} message - Die Log-Nachricht
 */
function writeToLogFile(level, message) {
    try {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}\n`;
        
        // Asynchrones Schreiben (angehängt)
        fs.appendFile(LOG_FILE, logEntry, err => {
            if (err) {
                console.error('Fehler beim Schreiben in Log-Datei:', err);
            }
        });
    } catch (err) {
        console.error('Fehler beim Loggen:', err);
    }
}

/**
 * Gibt Debug-Informationen aus und loggt sie in eine Datei, nur wenn das aktuelle Log-Level DEBUG ist
 * @param {string} message - Die Debug-Nachricht
 */
function debugLog(message) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG ${timestamp}] ${message}`);
        writeToLogFile('DEBUG', message);
    }
}

/**
 * Gibt Informationen aus und loggt sie in eine Datei (wenn Log-Level mindestens INFO ist)
 * @param {string} message - Die Info-Nachricht
 */
function infoLog(message) {
    if (CURRENT_LOG_LEVEL >= LOG_LEVELS.INFO) {
        const timestamp = new Date().toISOString();
        console.log(`[INFO ${timestamp}] ${message}`);
        writeToLogFile('INFO', message);
    }
}

/**
 * Gibt Fehlermeldungen aus und loggt sie in eine Datei (immer)
 * @param {string} message - Die Fehlermeldung
 */
function errorLog(message) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}] ${message}`);
    writeToLogFile('ERROR', message);
}

/**
 * Setzt das Log-Level
 * @param {string} level - Das zu setzende Log-Level ('error', 'info', 'debug')
 * @returns {boolean} - true wenn erfolgreich, false wenn das Level ungültig ist
 */
function setLogLevel(level) {
    level = level.toUpperCase();
    
    if (LOG_LEVELS[level] !== undefined) {
        CURRENT_LOG_LEVEL = LOG_LEVELS[level];
        infoLog(`Log-Level wurde auf "${level}" gesetzt`);
        return true;
    }
    
    errorLog(`Ungültiges Log-Level: ${level}`);
    return false;
}

/**
 * Gibt das aktuelle Log-Level zurück
 * @returns {string} - Das aktuelle Log-Level (ERROR, INFO oder DEBUG)
 */
function getLogLevel() {
    return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === CURRENT_LOG_LEVEL);
}

/**
 * Prüft, ob der Debug-Modus aktiviert ist
 * @returns {boolean} - true wenn der Debug-Modus aktiv ist, sonst false
 */
function isDebugMode() {
    return DEBUG_MODE;
}

module.exports = {
    debugLog,
    infoLog,
    errorLog,
    setLogLevel,
    getLogLevel,
    isDebugMode,
    LOG_LEVELS
};
