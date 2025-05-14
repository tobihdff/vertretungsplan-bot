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
import { getQuery, readBody, createError } from 'h3';
import type { H3Event } from 'h3';
import { Client, Account } from 'appwrite';

// Helper für asynchrones Lesen/Schreiben von Dateien
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

// Pfad zur .env-Datei im Hauptverzeichnis bestimmen
const rootDir = path.resolve(process.cwd(), '..');
const envFilePath = path.resolve(rootDir, '.env');
const logFilePath = path.resolve(rootDir, 'logs', 'bot.log');  // Direkte Referenz zur Log-Datei

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
  success: boolean;
  error?: string;
  [key: string]: unknown;
}

// Führt API-Anfrage an den Bot durch
const callBotAPI = async (endpoint: string, method = 'GET', body?: Record<string, unknown>, token?: string): Promise<ApiResponse> => {
  // Verwende die Port-Nummer aus der Umgebungsvariable oder den Standard-Port 3001
  const apiPort = process.env.WEB_API_PORT || 3001;
  const apiUrl = `http://localhost:${apiPort}${endpoint}`;
  
  console.log('\n=== Bot API Call Start ===');
  console.log('URL:', apiUrl);
  console.log('Method:', method);
  console.log('Body:', body);
  console.log('Token Preview:', token ? `${token.substring(0, 10)}...` : 'none');
  
  return new Promise((resolve, reject) => {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      } as Record<string, string>
    };

    // Forward the user's token if provided
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    console.log('Request Headers:', options.headers);

    const req = http.request(apiUrl, options, (res) => {
      console.log('Response Status:', res.statusCode);
      console.log('Response Headers:', res.headers);
      
      if (res.statusCode !== 200) {
        console.error('Non-200 status code received');
        return reject(new Error(`Status Code: ${res.statusCode}`));
      }
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          console.log('Raw Response Data:', data);
          const parsedData = JSON.parse(data);
          console.log('Parsed Response Data:', parsedData);
          console.log('=== Bot API Call End ===\n');
          resolve(parsedData);
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    if (body) {
      const bodyStr = JSON.stringify(body);
      console.log('Sending request body:', bodyStr);
      req.write(bodyStr);
    }
    
    req.end();
  });
};

// Hilfsfunktion zum Lesen der Log-Datei direkt (Fallback-Methode)
const readLogFile = async (type = 'all'): Promise<Array<{ timestamp: string; level: string; message: string; details?: string }>> => {
  try {
    // Prüfe, ob die Log-Datei existiert
    if (!fs.existsSync(logFilePath)) {
      console.log(`Log file not found at ${logFilePath}. Checking alternative paths...`);
      
      // Versuche alternative Log-Pfade
      const possibleLogPaths = [
        path.resolve(rootDir, 'logs', 'bot.log'),
        path.resolve(rootDir, 'bot.log'),
        path.resolve(rootDir, 'logs', 'app.log'),
        path.resolve(rootDir, 'log', 'bot.log')
      ];
      
      for (const possiblePath of possibleLogPaths) {
        if (fs.existsSync(possiblePath)) {
          console.log(`Found log file at alternative path: ${possiblePath}`);
          const content = await readFile(possiblePath, 'utf8');
          return parseLogContent(content, type);
        }
      }
      
      // Versuche alle Log-Dateien im logs Verzeichnis zu finden
      const logsDir = path.resolve(rootDir, 'logs');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir);
        const logFiles = files.filter(file => file.endsWith('.log'));
        
        if (logFiles.length > 0) {
          console.log(`Found log files in logs directory: ${logFiles.join(', ')}`);
          const latestLogFile = path.resolve(logsDir, logFiles[0]);
          console.log(`Reading from latest log file: ${latestLogFile}`);
          const content = await readFile(latestLogFile, 'utf8');
          return parseLogContent(content, type);
        }
      }
      
      console.log('No log files found in any location');
      return [];
    }
    
    console.log(`Reading log file directly from ${logFilePath}`);
    const content = await readFile(logFilePath, 'utf8');
    return parseLogContent(content, type);
  } catch (error) {
    console.error(`Error reading log file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return [];
  }
};

// Hilfsfunktion zum Parsen des Log-Inhalts mit verschiedenen Formaten
const parseLogContent = (content: string, type: string): Array<{ timestamp: string; level: string; message: string; details?: string }> => {
  const lines = content.split('\n').filter(line => line.trim() !== '');
  const logs = [];
  
  for (const line of lines) {
    // Standard-Format: [timestamp] [LEVEL] message - details
    const standardMatch = line.match(/\[([^\]]+)\] \[([A-Z]+)\] (.+)/);
    if (standardMatch) {
      const [, timestamp, level, messageWithDetails] = standardMatch;
      const parts = messageWithDetails.split(' - ');
      const message = parts[0];
      const details = parts.length > 1 ? parts.slice(1).join(' - ') : undefined;
      
      logs.push({
        timestamp,
        level: level.toLowerCase(),
        message,
        details
      });
      continue;
    }
    
    // Alternative Formate erkennen und parsen
    // Format 1: timestamp LEVEL: message
    const format1Match = line.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) ([A-Z]+): (.+)/);
    if (format1Match) {
      const [, timestamp, level, message] = format1Match;
      logs.push({
        timestamp,
        level: level.toLowerCase(),
        message
      });
      continue;
    }
    
    // Format 2: timestamp - LEVEL - message
    const format2Match = line.match(/(\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}) - ([A-Z]+) - (.+)/);
    if (format2Match) {
      const [, timestamp, level, message] = format2Match;
      logs.push({
        timestamp,
        level: level.toLowerCase(),
        message
      });
      continue;
    }
    
    // Wenn keine bekannten Formate erkannt wurden, fügen wir die Zeile als Info-Log hinzu
    if (line.trim()) {
      logs.push({
        timestamp: new Date().toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        level: 'info',
        message: line.trim()
      });
    }
  }
  
  // Filter by type if specified
  if (type !== 'all') {
    return logs.filter(log => log.level === type.toLowerCase());
  }
  
  return logs;
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

// Authentifizierung prüfen
const verifyAuth = async (event: H3Event) => {
  console.log('\n=== Auth Verification Start ===');
  const headers = event.headers;
  console.log('Request Headers:', Object.fromEntries(headers.entries()));
  
  try {
    const authorization = headers.get('authorization') || '';
    console.log('Authorization Header:', authorization);
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      console.log('No Bearer token found');
      throw createError({
        statusCode: 401,
        message: 'No Bearer token provided'
      });
    }

    const token = authorization.split(' ')[1];
    console.log('Token Length:', token.length);
    console.log('Token Preview:', `${token.substring(0, 10)}...`);

    const config = useRuntimeConfig();
    console.log('Appwrite Config:', {
      endpoint: config.public.appwriteEndpoint,
      projectId: config.public.appwriteProjectId
    });

    const client = new Client()
      .setEndpoint(config.public.appwriteEndpoint)
      .setProject(config.public.appwriteProjectId)
      .setJWT(token);

    const account = new Account(client);
    console.log('Attempting to verify token with Appwrite...');
    
    const user = await account.get();
    console.log('Token verification successful');
    console.log('User Info:', {
      id: user.$id,
      email: user.email,
      name: user.name
    });
    
    return user;
  } catch (error) {
    console.error('Auth Verification Error:', error);
    throw createError({
      statusCode: 401,
      message: error instanceof Error ? error.message : 'Authentication failed'
    });
  } finally {
    console.log('=== Auth Verification End ===\n');
  }
};

// Create the event handler
const botEventHandler = defineEventHandler(async (event: H3Event) => {
  // Skip auth for OPTIONS requests (CORS preflight)
  if (event.method === 'OPTIONS') {
    return { success: true };
  }

  try {
    // Verify auth and get user info
    await verifyAuth(event);
    const token = event.headers.get('authorization')?.split(' ')[1];

    const endpoint = event.path.replace('/api/bot', '');
    const method = event.method;
    const body = event.method !== 'GET' ? await readBody(event) : undefined;

    // Forward the request to the bot API with the user's token
    const response = await callBotAPI(endpoint, method, body, token);
    return response;
  } catch (error: unknown) {
    console.error('API Error:', error instanceof Error ? error.message : 'Unknown error');
    throw createError({
      statusCode: error instanceof Error && 'statusCode' in error ? (error.statusCode as number) : 500,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
});

// Add helper functions to the handler
Object.assign(botEventHandler, {
  getQuery,
  stopBot,
  startBot,
  readSettings,
  writeSettings,
  readLogFile,
  checkBotStatus,
  callBotAPI
});

// Export the enhanced event handler
export default botEventHandler;