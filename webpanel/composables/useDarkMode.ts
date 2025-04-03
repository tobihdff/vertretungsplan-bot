/**
 * Composable für den Darkmode des Webpanels
 * Verwaltet den Zustand des Darkmode und speichert die Benutzereinstellung
 */
export const useDarkMode = () => {
  // Zustand für den Darkmode
  const isDarkMode = useState<boolean>('darkMode', () => false);
  
  // Funktion zum Umschalten des Darkmode
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value;
    updateDarkMode();
  }
  
  // Funktion zum Setzen des Darkmode auf einen bestimmten Wert
  function setDarkMode(value: boolean) {
    isDarkMode.value = value;
    updateDarkMode();
  }
  
  // Aktualisiert das DOM und speichert die Einstellung
  function updateDarkMode() {
    if (process.client) {
      // Dark-Klasse im HTML-Element setzen oder entfernen
      if (isDarkMode.value) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    }
  }
  
  // Initialisierungsfunktion - lädt die gespeicherte Einstellung
  function init() {
    if (process.client) {
      // Gespeicherte Einstellung laden oder Systemeinstellung verwenden
      const savedMode = localStorage.getItem('darkMode');
      
      if (savedMode) {
        setDarkMode(savedMode === 'true');
      } else {
        // Systemeinstellung verwenden, wenn keine gespeicherte Einstellung vorhanden ist
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);
      }
    }
  }
  
  return {
    isDarkMode,
    toggleDarkMode,
    setDarkMode,
    init
  };
};