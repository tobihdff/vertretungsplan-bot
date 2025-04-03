/**
 * DateUtils - Klasse für die Verarbeitung von Datumsoperationen
 */
class DateUtils {
  // Konstanten für Wochentage
  static DAY_TUESDAY = 2;
  static DAY_THURSDAY = 4;

  /**
   * Ermittelt das Datum des nächsten Unterrichtstags (Di/Do)
   * @returns {Date} Das nächste Unterrichtsdatum
   */
  getTargetDate() {
    const now = new Date();
    const day = now.getDay();
    
    // Falls heute Di/Do ist und vor 13 Uhr, dann heutiges Datum verwenden
    if ((day === DateUtils.DAY_TUESDAY || day === DateUtils.DAY_THURSDAY) && now.getHours() < 13) {
      return now;
    }
    
    // Berechne Tage bis nächster Dienstag oder Donnerstag
    let diffTuesday = (DateUtils.DAY_TUESDAY - day + 7) % 7;
    if(diffTuesday === 0) diffTuesday = 7;
    
    let diffThursday = (DateUtils.DAY_THURSDAY - day + 7) % 7;
    if(diffThursday === 0) diffThursday = 7;
    
    // Verwende das frühere Datum
    const diff = Math.min(diffTuesday, diffThursday);
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    
    return target;
  }

  /**
   * Formatiert ein Datum im deutschen Format DD.MM.YYYY
   * @param {Date} date - Das zu formatierende Datum
   * @returns {string} Das formatierte Datum
   */
  formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  /**
   * Konvertiert ein deutsches Datum (DD.MM.YYYY) in ein Date-Objekt
   * @param {string} germanDateStr - Das zu konvertierende Datum
   * @returns {Date} Das konvertierte Date-Objekt
   */
  parseGermanDate(germanDateStr) {
    // Erwartet Format "dd.mm.yyyy"
    const parts = germanDateStr.split('.');
    if(parts.length !== 3) throw new Error("Ungültiges Datumformat");
    // Beachte: Monat im Date-Konstruktor ist 0-basiert
    return new Date(parts[2], parts[1]-1, parts[0]);
  }

  /**
   * Formatiert ein Datum in einen lesbaren deutschen String
   * @param {Date} date - Das zu formatierende Datum
   * @returns {string} Das formatierte Datum
   */
  formatReadableDate(date) {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

// Singleton-Instanz erstellen
const dateUtils = new DateUtils();

module.exports = {
  getTargetDate: () => dateUtils.getTargetDate(),
  formatDate: (date) => dateUtils.formatDate(date),
  parseGermanDate: (germanDateStr) => dateUtils.parseGermanDate(germanDateStr),
  formatReadableDate: (date) => dateUtils.formatReadableDate(date)
};
