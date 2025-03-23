/**
 * Ermittelt das Datum des nächsten Unterrichtstags (Di/Do)
 */
function getTargetDate() {
    const now = new Date();
    const day = now.getDay();
    // Dienstag = 2, Donnerstag = 4
    if ((day === 2 || day === 4) && now.getHours() < 12) {
        return now;
    }
    const DAY_TUESDAY = 2, DAY_THURSDAY = 4;
    let diffTuesday = (DAY_TUESDAY - day + 7) % 7;
    if(diffTuesday === 0) diffTuesday = 7;
    let diffThursday = (DAY_THURSDAY - day + 7) % 7;
    if(diffThursday === 0) diffThursday = 7;
    const diff = Math.min(diffTuesday, diffThursday);
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    return target;
}

/**
 * Formatiert ein Datum im deutschen Format DD.MM.YYYY
 */
function formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
}

/**
 * Konvertiert ein deutsches Datum (DD.MM.YYYY) in ein Date-Objekt
 */
function parseGermanDate(germanDateStr) {
    // Erwartet Format "dd.mm.yyyy"
    const parts = germanDateStr.split('.');
    if(parts.length !== 3) throw new Error("Ungültiges Datumformat");
    // Beachte: Monat im Date-Konstruktor ist 0-basiert
    return new Date(parts[2], parts[1]-1, parts[0]);
}

/**
 * Formatiert ein Datum in einen lesbaren deutschen String
 */
function formatReadableDate(date) {
    return date.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

module.exports = {
    getTargetDate,
    formatDate,
    parseGermanDate,
    formatReadableDate
};
