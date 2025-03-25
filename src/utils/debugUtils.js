const { DEBUG } = require('../config');

/**
 * Gibt Debug-Informationen aus, wenn der Debug-Modus aktiv ist
 * @param {string} message - Die Debug-Nachricht
 */
function debugLog(message) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG ${timestamp}] ${message}`);
    }
}

module.exports = {
    debugLog
};
