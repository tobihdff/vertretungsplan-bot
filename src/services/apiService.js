const { BASE_URL, API_KEY } = require('../config');

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
        
        return await response.json();
    } catch (err) {
        console.error('Error fetching data:', err);
        return []; // Fallback: leeres Array
    }
}

module.exports = {
    fetchData
};
