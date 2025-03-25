const { BASE_URL, API_KEY, cache } = require('../config');

/**
 * Ruft Vertretungsplan-Daten von der API ab
 */
async function fetchData(dateParam) {
    try {
        const response = await fetch(`${BASE_URL}?date=${dateParam}`, {
            headers: {
                "appwrite-admin": API_KEY
            }
        });
        
        if (!response.ok) {
            throw new Error(`Fetch error: ${response.status} ${response.statusText}`);
        }
        
        // API ist erreichbar
        if (!cache.apiAvailable) {
            console.log('API ist wieder erreichbar!');
            cache.apiAvailable = true;
        }
        
        return await response.json();
    } catch (err) {
        console.error('Error fetching data:', err);
        // API ist nicht erreichbar
        cache.apiAvailable = false;
        return []; // Fallback: leeres Array
    }
}

/**
 * Überprüft, ob die API erreichbar ist
 */
async function checkApiAvailability() {
    try {
        const response = await fetch(BASE_URL, {
            headers: {
                "appwrite-admin": API_KEY
            },
            method: 'HEAD' // Nur Header anfragen, keine Daten
        });
        
        const isAvailable = response.ok;
        const statusChanged = cache.apiAvailable !== isAvailable;
        
        cache.apiAvailable = isAvailable;
        return { available: isAvailable, statusChanged };
    } catch (err) {
        const statusChanged = cache.apiAvailable !== false;
        cache.apiAvailable = false;
        console.error('API Availability Check Failed:', err);
        return { available: false, statusChanged };
    }
}

module.exports = {
    fetchData,
    checkApiAvailability
};
