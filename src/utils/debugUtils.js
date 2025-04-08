const fs = require('fs');
const path = require('path');
const { DEBUG } = require('../config');

// Konstanten für Log-Pfade
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

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
 * Gibt Debug-Informationen aus und loggt sie in eine Datei, wenn der Debug-Modus aktiv ist
 * @param {string} message - Die Debug-Nachricht
 */
function debugLog(message) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG ${timestamp}] ${message}`);
        writeToLogFile('DEBUG', message);
    }
}

/**
 * Gibt Informationen aus und loggt sie in eine Datei (immer)
 * @param {string} message - Die Info-Nachricht
 */
function infoLog(message) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO ${timestamp}] ${message}`);
    writeToLogFile('INFO', message);
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

module.exports = {
    debugLog,
    infoLog,
    errorLog
};
