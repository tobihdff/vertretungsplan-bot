/**
 * Bot API-Endpunkte für das Webpanel
 * Diese API verbindet das Webpanel mit dem Bot und erlaubt die Steuerung und Konfiguration
 */
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';

// Helper für asynchrones Lesen/Schreiben von Dateien
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Pfad zur .env-Datei im Hauptverzeichnis bestimmen
const rootDir = path.resolve(process.cwd(), '..');
const envFilePath = path.resolve(rootDir, '.env');
const logFilePath = path.resolve(rootDir, 'logs', 'bot.log');

// Bot-Prozess steuern
let botProcess: any = null;

// Bot stoppen
const stopBot = () => {
  return new Promise<void>(async (resolve) => {
    try {
      if (botProcess) {
        botProcess.kill();
        botProcess = null;
      }
      resolve();
    } catch (error) {
      console.error('Fehler beim Stoppen des Bots:', error);
      resolve();
    }
  });
};

// Bot starten
const startBot = () => {
  return new Promise<void>((resolve) => {
    try {
      botProcess = spawn('node', ['index.js'], {
        cwd: rootDir,
        stdio: 'ignore',
        detached: true
      });
      
      botProcess.unref(); // Vom Elternprozess lösen
      resolve();
    } catch (error) {
      console.error('Fehler beim Starten des Bots:', error);
      resolve();
    }
  });
};

// Hilfsfunktion zum Lesen der Einstellungen aus der .env-Datei
const readSettings = async () => {
  try {
    const data = await readFile(envFilePath, 'utf8');
    const lines = data.split('\n');
    
    // Einstellungen parsen
    const settings: Record<string, string | number | boolean> = {};
    
    lines.forEach((line: string) => {
      if (line.trim() !== '' && !line.startsWith('#')) {
        const [key, value] = line.split('=');
        if (key && value) {
          settings[key.trim()] = value.trim();
        }
      }
    });
    
    // Einstellungen in benötigte Formate konvertieren
    return {
      planChannelId: settings.PLAN_CHANNEL_ID as string || '',
      notificationChannelId: settings.NOTIFICATION_CHANNEL_ID as string || '',
      updateRoleId: settings.UPDATE_ROLE_ID as string || '',
      authorizedUsers: settings.AUTHORIZED_USERS as string || '',
      updateInterval: parseInt(settings.UPDATE_INTERVAL_MINUTES as string || '20'),
      checkInterval: parseInt(settings.CHECK_INTERVAL_MINUTES as string || '20'),
      apiUrl: settings.API_URL_PROD as string || '',
      apiKey: settings.api_key as string || '',
      debugMode: settings.DEBUG === 'true'
    };
  } catch (error) {
    console.error('Fehler beim Lesen der Einstellungen:', error);
    return {};
  }
};

// Hilfsfunktion zum Schreiben der Einstellungen in die .env-Datei
const writeSettings = async (settings: any) => {
  try {
    // Vorhandene .env-Datei lesen, um Kommentare zu erhalten
    const currentData = await readFile(envFilePath, 'utf8');
    const lines = currentData.split('\n');
    
    // Neue Werte aktualisieren und Kommentare beibehalten
    const updatedLines = lines.map((line: string) => {
      if (line.trim() === '' || line.startsWith('#')) {
        return line; // Kommentare und Leerzeilen beibehalten
      }
      
      const [key] = line.split('=');
      if (!key) return line;
      
      const trimmedKey = key.trim();
      
      if (trimmedKey === 'PLAN_CHANNEL_ID' && settings.planChannelId !== undefined) {
        return `PLAN_CHANNEL_ID=${settings.planChannelId}`;
      }
      if (trimmedKey === 'NOTIFICATION_CHANNEL_ID' && settings.notificationChannelId !== undefined) {
        return `NOTIFICATION_CHANNEL_ID=${settings.notificationChannelId}`;
      }
      if (trimmedKey === 'UPDATE_ROLE_ID' && settings.updateRoleId !== undefined) {
        return `UPDATE_ROLE_ID=${settings.updateRoleId}`;
      }
      if (trimmedKey === 'AUTHORIZED_USERS' && settings.authorizedUsers !== undefined) {
        return `AUTHORIZED_USERS=${settings.authorizedUsers}`;
      }
      if (trimmedKey === 'UPDATE_INTERVAL_MINUTES' && settings.updateInterval !== undefined) {
        return `UPDATE_INTERVAL_MINUTES=${settings.updateInterval}`;
      }
      if (trimmedKey === 'CHECK_INTERVAL_MINUTES' && settings.checkInterval !== undefined) {
        return `CHECK_INTERVAL_MINUTES=${settings.checkInterval}`;
      }
      if (trimmedKey === 'API_URL_PROD' && settings.apiUrl !== undefined) {
        return `API_URL_PROD=${settings.apiUrl}`;
      }
      if (trimmedKey === 'api_key' && settings.apiKey !== undefined) {
        return `api_key=${settings.apiKey}`;
      }
      if (trimmedKey === 'DEBUG' && settings.debugMode !== undefined) {
        return `DEBUG=${settings.debugMode}`;
      }
      
      return line;
    });
    
    await writeFile(envFilePath, updatedLines.join('\n'));
    return true;
  } catch (error) {
    console.error('Fehler beim Speichern der Einstellungen:', error);
    return false;
  }
};

// Endpunkt: Bot-Status abrufen
export default defineEventHandler(async (event) => {
  const method = event.method;
  const path = event.path;
  
  // GET /api/bot/status - Bot-Status abrufen
  if (method === 'GET' && path === '/api/bot/status') {
    // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
    // Für dieses Beispiel geben wir statische Daten zurück
    return {
      success: true,
      active: true, // Annahme: Der Bot ist aktiv
      maintenanceMode: false, // Annahme: Wartungsmodus ist deaktiviert
      lastUpdate: new Date().toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      recentActivities: [
        { type: 'update', message: 'Vertretungsplan aktualisiert', timestamp: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
        { type: 'status', message: 'Bot gestartet', timestamp: new Date(Date.now() - 3600000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
      ]
    };
  }
  
  // GET /api/bot/settings - Bot-Einstellungen abrufen
  if (method === 'GET' && path === '/api/bot/settings') {
    try {
      const settings = await readSettings();
      return { success: true, settings };
    } catch (error: any) {
      return { success: false, error: error.message || 'Einstellungen konnten nicht geladen werden' };
    }
  }
  
  // POST /api/bot/settings - Bot-Einstellungen speichern
  if (method === 'POST' && path === '/api/bot/settings') {
    try {
      const body = await readBody(event);
      const success = await writeSettings(body);
      
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Einstellungen konnten nicht gespeichert werden' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Einstellungen konnten nicht gespeichert werden' };
    }
  }
  
  // POST /api/bot/restart - Bot neustarten
  if (method === 'POST' && path === '/api/bot/restart') {
    try {
      // Bot stoppen und neu starten
      await stopBot();
      setTimeout(async () => {
        await startBot();
      }, 1000);
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Bot konnte nicht neu gestartet werden' };
    }
  }
  
  // POST /api/bot/maintenance - Wartungsmodus umschalten
  if (method === 'POST' && path === '/api/bot/maintenance') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      // Für dieses Beispiel geben wir Erfolg zurück, ohne tatsächliche Änderungen vorzunehmen
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Wartungsmodus konnte nicht umgeschaltet werden' };
    }
  }
  
  // POST /api/bot/force-update - Update erzwingen
  if (method === 'POST' && path === '/api/bot/force-update') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      // Für dieses Beispiel geben wir Erfolg zurück, ohne tatsächliche Änderungen vorzunehmen
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Update konnte nicht erzwungen werden' };
    }
  }
  
  // POST /api/bot/test-notification - Benachrichtigung testen
  if (method === 'POST' && path === '/api/bot/test-notification') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Benachrichtigung konnte nicht getestet werden' };
    }
  }
  
  // POST /api/bot/test-plan - Plan-Generierung testen
  if (method === 'POST' && path === '/api/bot/test-plan') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Plan-Generierung konnte nicht getestet werden' };
    }
  }
  
  // POST /api/bot/test-update - Änderungserkennung testen
  if (method === 'POST' && path === '/api/bot/test-update') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Änderungserkennung konnte nicht getestet werden' };
    }
  }
  
  // POST /api/bot/clear-channel - Channel leeren
  if (method === 'POST' && path === '/api/bot/clear-channel') {
    try {
      // Hier würde normalerweise die Kommunikation mit dem Bot über IPC oder eine Datenbank stattfinden
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Channel konnte nicht geleert werden' };
    }
  }
  
  // GET /api/bot/logs - Logs abrufen
  if (method === 'GET' && path === '/api/bot/logs') {
    try {
      // In einer echten Implementierung würden wir hier die Logs aus einer Datei lesen
      // Für dieses Beispiel geben wir einige Mock-Logs zurück
      const query = getQuery(event);
      const type = query.type as string || 'all';
      
      const mockLogs = [
        { timestamp: '03.04.2025 10:15:00', level: 'info', message: 'Bot gestartet' },
        { timestamp: '03.04.2025 10:15:10', level: 'debug', message: 'Vertretungsplan wird abgerufen', details: 'URL: https://api.example.com/vertretungsplan' },
        { timestamp: '03.04.2025 10:15:15', level: 'info', message: 'Vertretungsplan erfolgreich aktualisiert' },
        { timestamp: '03.04.2025 10:15:30', level: 'debug', message: 'Prüfe auf Änderungen' },
        { timestamp: '03.04.2025 10:16:00', level: 'info', message: 'Keine Änderungen gefunden' },
        { timestamp: '03.04.2025 11:00:00', level: 'error', message: 'Fehler beim Abrufen des Vertretungsplans', details: 'API nicht erreichbar: Timeout' }
      ];
      
      let filteredLogs = mockLogs;
      if (type !== 'all') {
        filteredLogs = mockLogs.filter(log => log.level === type);
      }
      
      return { success: true, logs: filteredLogs };
    } catch (error: any) {
      return { success: false, error: error.message || 'Logs konnten nicht geladen werden' };
    }
  }
  
  // DELETE /api/bot/logs - Logs löschen
  if (method === 'DELETE' && path === '/api/bot/logs') {
    try {
      // In einer echten Implementierung würden wir hier die Logs löschen
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Logs konnten nicht gelöscht werden' };
    }
  }
  
  // POST /api/bot/log-level - Log-Level setzen
  if (method === 'POST' && path === '/api/bot/log-level') {
    try {
      const body = await readBody(event);
      // In einer echten Implementierung würden wir hier das Log-Level setzen
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Log-Level konnte nicht gesetzt werden' };
    }
  }
  
  // Unbekannter Endpunkt
  return { success: false, error: 'Unbekannter API-Endpunkt' };
});