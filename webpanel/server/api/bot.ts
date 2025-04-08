/**
 * Bot API-Endpunkte für das Webpanel
 * Diese API verbindet das Webpanel mit dem Bot und erlaubt die Steuerung und Konfiguration
 */
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';
import { spawn } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import http from 'node:http';
import { getQuery, readBody } from 'h3';

// Helper für asynchrones Lesen/Schreiben von Dateien
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Pfad zur .env-Datei im Hauptverzeichnis bestimmen
const rootDir = path.resolve(process.cwd(), '..');
const envFilePath = path.resolve(rootDir, '.env');
const _logFilePath = path.resolve(rootDir, 'logs', 'bot.log');

// Bot-Prozess steuern
let botProcess: ChildProcess | null = null;

// Bot stoppen
const stopBot = () => {
  return new Promise<void>((resolve) => {
    try {
      if (botProcess) {
        botProcess.kill();
        botProcess = null;
      }
      resolve();
    } catch {
      console.error('Fehler beim Stoppen des Bots:');
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
    } catch {
      console.error('Fehler beim Starten des Bots:');
      resolve();
    }
  });
};

interface BotSettings {
  planChannelId?: string;
  notificationChannelId?: string;
  updateRoleId?: string;
  authorizedUsers?: string;
  updateInterval?: number;
  checkInterval?: number;
  apiUrl?: string;
  apiKey?: string;
  debugMode?: boolean;
}

// Hilfsfunktion zum Lesen der Einstellungen aus der .env-Datei
const readSettings = async (): Promise<BotSettings> => {
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
      debugMode: settings.DEBUG_MODE === 'true'
    };
  } catch {
    console.error('Fehler beim Lesen der Einstellungen:');
    return {};
  }
};

// Hilfsfunktion zum Schreiben der Einstellungen in die .env-Datei
const writeSettings = async (settings: BotSettings): Promise<boolean> => {
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
      if (trimmedKey === 'DEBUG_MODE' && settings.debugMode !== undefined) {
        return `DEBUG_MODE=${settings.debugMode}`;
      }
      
      return line;
    });
    
    await writeFile(envFilePath, updatedLines.join('\n'));
    return true;
  } catch {
    console.error('Fehler beim Speichern der Einstellungen:');
    return false;
  }
};

interface ApiResponse {
  [key: string]: unknown;
}

// Führt API-Anfrage an den Bot durch
const callBotAPI = async (endpoint: string, method = 'GET', body?: Record<string, unknown>): Promise<ApiResponse> => {
  const apiPort = process.env.WEB_API_PORT || 3001;
  const apiUrl = `http://localhost:${apiPort}${endpoint}`;
  
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(apiUrl, options, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve(parsedData);
        } catch {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
};

interface BotStatus {
  active: boolean;
  maintenanceMode: boolean;
  lastUpdate: string;
  recentActivities: Array<{
    type: string;
    message: string;
    timestamp: string;
  }>;
}

// Prüft den tatsächlichen Bot-Status, indem die API-Verbindung getestet wird
const checkBotStatus = async (): Promise<BotStatus> => {
  try {
    // Versuche die Statusabfrage an den Bot zu senden
    const botStatus = await callBotAPI('/api/bot/status') as unknown as BotStatus;
    
    // Wenn wir hier sind, ist der Bot erreichbar
    return {
      active: true,
      maintenanceMode: botStatus.maintenanceMode || false,
      lastUpdate: botStatus.lastUpdate || new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      recentActivities: botStatus.recentActivities || [{
        type: 'status',
        message: 'Verbindung zum Bot hergestellt',
        timestamp: new Date().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }]
    };
  } catch {
    // Bot ist nicht erreichbar
    return {
      active: false,
      maintenanceMode: false,
      lastUpdate: 'Unbekannt',
      recentActivities: [{
        type: 'status',
        message: 'Bot ist nicht erreichbar',
        timestamp: new Date().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      }]
    };
  }
};

// Endpunkt: Bot-Status abrufen
export default defineEventHandler(async (event) => {
  const method = event.method;
  const path = event.path;
  
  // GET /api/bot/status - Bot-Status abrufen
  if (method === 'GET' && path === '/api/bot/status') {
    try {
      // Tatsächlichen Bot-Status prüfen
      const botStatus = await checkBotStatus();
      
      return {
        success: true,
        ...botStatus
      };
    } catch {
      return {
        success: true,
        active: false,
        maintenanceMode: false,
        lastUpdate: 'Unbekannt',
        recentActivities: [
          { type: 'error', message: 'Fehler beim Abrufen des Bot-Status', timestamp: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
        ]
      };
    }
  }
  
  // GET /api/bot/settings - Bot-Einstellungen abrufen
  if (method === 'GET' && path === '/api/bot/settings') {
    try {
      const settings = await readSettings();
      return { success: true, settings };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Einstellungen konnten nicht geladen werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/settings - Bot-Einstellungen speichern
  if (method === 'POST' && path === '/api/bot/settings') {
    try {
      const body = await readBody(event) as BotSettings;
      const success = await writeSettings(body);
      
      if (success) {
        return { success: true };
      } else {
        return { success: false, error: 'Einstellungen konnten nicht gespeichert werden' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Einstellungen konnten nicht gespeichert werden';
      return { success: false, error: errorMessage };
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bot konnte nicht neu gestartet werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/maintenance - Wartungsmodus umschalten
  if (method === 'POST' && path === '/api/bot/maintenance') {
    try {
      const body = await readBody(event) as { enable: boolean };
      const { enable } = body;
      
      // Versuchen, den Wartungsmodus über die Bot-API umzuschalten
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // API-Endpunkt für Wartungsmodus aufrufen
      const endpoint = enable ? '/api/bot/maintenance/enable' : '/api/bot/maintenance/disable';
      await callBotAPI(endpoint, 'POST');
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Wartungsmodus konnte nicht umgeschaltet werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/force-update - Update erzwingen
  if (method === 'POST' && path === '/api/bot/force-update') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // API-Endpunkt für Force-Update aufrufen
      await callBotAPI('/api/bot/update/force', 'POST');
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Update konnte nicht erzwungen werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/test-notification - Benachrichtigung testen
  if (method === 'POST' && path === '/api/bot/test-notification') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // API-Endpunkt für Test-Benachrichtigung aufrufen
      await callBotAPI('/api/bot/test/notification', 'POST');
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Benachrichtigung konnte nicht getestet werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/test-plan - Plan-Generierung testen
  if (method === 'POST' && path === '/api/bot/test-plan') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // API-Endpunkt für Test-Plan-Generierung aufrufen
      await callBotAPI('/api/bot/test/plan', 'POST');
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Plan-Generierung konnte nicht getestet werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/test-update - Änderungserkennung testen
  if (method === 'POST' && path === '/api/bot/test-update') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // API-Endpunkt für Test-Änderungserkennung aufrufen
      await callBotAPI('/api/bot/test/update', 'POST');
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Änderungserkennung konnte nicht getestet werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/clear-channel - Channel leeren
  if (method === 'POST' && path === '/api/bot/clear-channel') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      const body = await readBody(event) as { channelId: string };
      const { channelId } = body;
      
      // API-Endpunkt für Channel-Leeren aufrufen
      await callBotAPI('/api/bot/channel/clear', 'POST', { channelId });
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Channel konnte nicht geleert werden';
      return { success: false, error: errorMessage };
    }
  }
  
  interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    details?: string;
  }
  
  // GET /api/bot/logs - Logs abrufen
  if (method === 'GET' && path === '/api/bot/logs') {
    try {
      const query = getQuery(event);
      const type = query.type as string || 'all';
      
      // Prüfen, ob Bot läuft und Logs darüber abrufen
      const botStatus = await checkBotStatus();
      
      // Wenn Bot läuft, versuche echte Logs abzurufen
      if (botStatus.active) {
        try {
          const logsResponse = await callBotAPI(`/api/bot/logs?type=${type}`, 'GET') as unknown as { logs: LogEntry[] };
          if (logsResponse && logsResponse.logs) {
            return { success: true, logs: logsResponse.logs };
          }
        } catch {
          console.error('Fehler beim Abrufen der Bot-Logs:');
          // Bei Fehler fallen wir auf Mock-Logs zurück
        }
      }
      
      // Fallback auf Mock-Logs
      const mockLogs: LogEntry[] = [
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
      
      return { 
        success: true, 
        logs: filteredLogs, 
        note: botStatus.active ? 'Echte Logs konnten nicht abgerufen werden' : 'Bot ist nicht erreichbar, verwende Mock-Logs'
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Logs konnten nicht geladen werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // DELETE /api/bot/logs - Logs löschen
  if (method === 'DELETE' && path === '/api/bot/logs') {
    try {
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // Bot-API für Log-Löschung aufrufen
      try {
        await callBotAPI('/api/bot/logs', 'DELETE');
        return { success: true };
      } catch {
        return { success: false, error: 'Logs konnten nicht gelöscht werden' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Logs konnten nicht gelöscht werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // POST /api/bot/log-level - Log-Level setzen
  if (method === 'POST' && path === '/api/bot/log-level') {
    try {
      const body = await readBody(event) as { level: string };
      const { level } = body;
      
      // Prüfen, ob der Bot läuft
      const botStatus = await checkBotStatus();
      if (!botStatus.active) {
        return { success: false, error: 'Bot ist nicht erreichbar' };
      }
      
      // Bot-API für Log-Level-Änderung aufrufen
      try {
        await callBotAPI('/api/bot/log-level', 'POST', { level });
        return { success: true };
      } catch {
        return { success: false, error: 'Log-Level konnte nicht gesetzt werden' };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Log-Level konnte nicht gesetzt werden';
      return { success: false, error: errorMessage };
    }
  }
  
  // Unbekannter Endpunkt
  return { success: false, error: 'Unbekannter API-Endpunkt' };
});