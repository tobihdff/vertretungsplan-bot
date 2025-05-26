class DateUtils {
  static DAY_TUESDAY = 2;
  static DAY_THURSDAY = 4;

  getTargetDate() {
    const now = new Date();
    const day = now.getDay();
    
    if ((day === DateUtils.DAY_TUESDAY || day === DateUtils.DAY_THURSDAY) && now.getHours() < 13) {
      return now;
    }
    
    let diffTuesday = (DateUtils.DAY_TUESDAY - day + 7) % 7;
    if(diffTuesday === 0) diffTuesday = 7;
    
    let diffThursday = (DateUtils.DAY_THURSDAY - day + 7) % 7;
    if(diffThursday === 0) diffThursday = 7;
    
    const diff = Math.min(diffTuesday, diffThursday);
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    
    return target;
  }

  getPreviousDate() {
    const now = new Date();
    const day = now.getDay();
    
    if ((day === DateUtils.DAY_TUESDAY || day === DateUtils.DAY_THURSDAY) && now.getHours() < 15) {
      return now;
    }
    
    let diffTuesday = (day - DateUtils.DAY_TUESDAY + 7) % 7;
    if(diffTuesday === 0) diffTuesday = 7;
    
    let diffThursday = (day - DateUtils.DAY_THURSDAY + 7) % 7;
    if(diffThursday === 0) diffThursday = 7;
    
    const diff = Math.min(diffTuesday, diffThursday);
    const target = new Date(now);
    target.setDate(now.getDate() - diff);
    
    return target;
  }

  formatDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }

  parseGermanDate(germanDateStr) {
    const parts = germanDateStr.split('.');
    if(parts.length !== 3) throw new Error("Ungültiges Datumformat");
    return new Date(parts[2], parts[1]-1, parts[0]);
  }

  formatReadableDate(date) {
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
}

const dateUtils = new DateUtils();

module.exports = {
  getTargetDate: () => dateUtils.getTargetDate(),
  getPreviousDate: () => dateUtils.getPreviousDate(),
  formatDate: (date) => dateUtils.formatDate(date),
  parseGermanDate: (germanDateStr) => dateUtils.parseGermanDate(germanDateStr),
  formatReadableDate: (date) => dateUtils.formatReadableDate(date)
};
