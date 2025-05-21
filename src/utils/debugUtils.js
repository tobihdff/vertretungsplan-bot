const { DEBUG } = require('../config');

function debugLog(message) {
    if (DEBUG) {
        const timestamp = new Date().toISOString();
        console.log(`[DEBUG ${timestamp}] ${message}`);
    }
}

module.exports = {
    debugLog
};
