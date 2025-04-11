import { reactive, onBeforeUnmount } from 'vue';

// Toast-Nachrichtentypen und Interface
export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
  createdAt: number; // Zeitstempel für bessere Verwaltung
}

// Singleton-Instanz für bessere Performance
let __toasts: Toast[] | null = null;
let __counter = 0;
let __timeoutRefs: Map<number, NodeJS.Timeout> = new Map();

// Optimierte Konstanten
const DEFAULT_DURATION = 5000;
const MAX_TOASTS = 5;
const MIN_DURATION = 2000;
const MAX_DURATION = 20000;

/**
 * Toast-Benachrichtigungsdienst mit optimierter Performance
 * und verbesserter Speicherverwaltung
 */
export default function useToast() {
  // Initialisiere den Status nur einmal
  if (!__toasts) {
    __toasts = reactive<Toast[]>([]);
  }
  
  const toasts = __toasts;
  
  // Autoatisches Aufräumen auf der Client-Seite
  if (import.meta.client) {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      // Entferne abgelaufene Toasts, die noch im Array sind
      toasts.forEach(toast => {
        if (now - toast.createdAt > toast.duration + 1000) {
          removeToast(toast.id);
        }
      });
    }, 10000); // Alle 10 Sekunden prüfen
    
    // Bereinige Ressourcen bei Komponentenabbau
    onBeforeUnmount(() => {
      clearInterval(cleanupInterval);
    });
  }
  
  /**
   * Zeigt eine Toast-Nachricht an mit verbesserten Checks und Optimierungen
   */
  const showToast = (
    message: string, 
    type: Toast['type'] = 'info', 
    duration: number = DEFAULT_DURATION
  ): number => {
    // Validierung und Normalisierung der Parameter
    if (!message?.trim()) {
      console.warn('Toast-Nachricht fehlt oder ist leer');
      return -1; // Ungültige ID signalisiert Fehler
    }
    
    // Duplikate vermeiden
    const duplicate = toasts.find(t => 
      t.message === message && 
      t.type === type && 
      Date.now() - t.createdAt < 1000
    );
    if (duplicate) {
      return duplicate.id; // Keine Duplikate in kurzem Zeitraum
    }
    
    // Limits für Duration durchsetzen
    duration = Math.max(MIN_DURATION, Math.min(duration, MAX_DURATION));
    
    // Verhindere zu viele gleichzeitige Toasts
    if (toasts.length >= MAX_TOASTS) {
      // Entferne den ältesten Toast
      const oldestToast = toasts.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest, toasts[0]);
      removeToast(oldestToast.id);
    }
    
    const id = __counter++;
    const toast: Toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now()
    };
    
    // Toast zur Liste hinzufügen
    toasts.push(toast);
    
    // Nur auf Client-Seite Timeout setzen mit Referenzverwaltung
    if (import.meta.client && duration > 0) {
      const timeoutId = setTimeout(() => {
        removeToast(id);
        __timeoutRefs.delete(id); // Referenz entfernen
      }, duration);
      
      // Referenz speichern für späteres Aufräumen
      __timeoutRefs.set(id, timeoutId);
    }
    
    return id;
  };
  
  /**
   * Entfernt einen Toast und säubert alle Ressourcen
   */
  const removeToast = (id: number): boolean => {
    const index = toasts.findIndex(toast => toast.id === id);
    if (index !== -1) {
      toasts.splice(index, 1);
      
      // Timeout bereinigen, falls vorhanden
      if (__timeoutRefs.has(id)) {
        clearTimeout(__timeoutRefs.get(id)!);
        __timeoutRefs.delete(id);
      }
      
      return true;
    }
    return false;
  };
  
  /**
   * Entfernt alle Toasts mit ordnungsgemäßer Ressourcenbereinigung
   */
  const clearAll = (): void => {
    // Alle Timeouts bereinigen
    toasts.forEach(toast => {
      if (__timeoutRefs.has(toast.id)) {
        clearTimeout(__timeoutRefs.get(toast.id)!);
        __timeoutRefs.delete(toast.id);
      }
    });
    
    // Array leeren
    toasts.splice(0, toasts.length);
  };
  
  // Hilfsfunktionen für häufige Toast-Typen
  const showSuccess = (message: string, duration = DEFAULT_DURATION) => 
    showToast(message, 'success', duration);
  
  const showError = (message: string, duration = DEFAULT_DURATION) => 
    showToast(message, 'error', duration);
    
  const showInfo = (message: string, duration = DEFAULT_DURATION) => 
    showToast(message, 'info', duration);
    
  const showWarning = (message: string, duration = DEFAULT_DURATION) => 
    showToast(message, 'warning', duration);

  return {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeToast,
    clearAll
  };
}