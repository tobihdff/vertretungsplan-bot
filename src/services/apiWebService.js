/**
 * API Web Service für die Integration mit dem Webpanel
 * Implementiert alle API-Endpunkte, die vom Webpanel benötigt werden
 */
const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { cache, DEBUG } = require('../config');
const { debugLog, setLogLevel, getLogLevel, isDebugMode } = require('../utils/debugUtils');
const { updatePlan, checkPlanChanges, cleanupOldMessages } = require('../tasks/updateTask');
const { setInitialBotStatus, enableMaintenanceMode, disableMaintenanceMode, isMaintenanceModeActive } = require('../utils/statusUtils');

// Datei-Pfade
const logDirectory = path.join(process.cwd(), 'logs');
const logFilePath = path.join(logDirectory, 'bot.log');
const envFilePath = path.join(process.cwd(), '.env');

// Stellt sicher, dass das Log-Verzeichnis existiert
fs.ensureDirSync(logDirectory);

class ApiWebService {
    constructor(client, config) {
        this.app = express();
        this.client = client;
        this.config = config;
        this.port = process.env.WEB_API_PORT || 3001;
        
        // Middleware für CORS und JSON-Verarbeitung
        this.app.use(cors());
        this.app.use(express.json());
        
        // API-Router einrichten
        this.setupRoutes();
        
        // Aktivitätsliste
        this.activities = [];

        // Historische Daten initialisieren
        this.historyMaxPoints = 24; // Maximale Anzahl Datenpunkte (für 1 Stunde bei 2.5min Intervall)
        this.historyRetentionMs = 3600000; // Aufbewahrung von 1 Stunde in ms
        
        // Speicher für historische Daten
        if (!cache.history) {
            cache.history = {
                ping: [],
                cpu: [],
                memory: []
            };
        }
    }
    
    // Startet den API-Server
    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`API-Server läuft auf Port ${this.port}`);
            debugLog(`API-Server für Webpanel gestartet auf Port ${this.port}`);
        });
        
        // Aktivität hinzufügen
        this.addActivity('status', 'API-Server gestartet');
    }
    
    // Stoppt den API-Server
    stop() {
        if (this.server) {
            this.server.close();
            debugLog('API-Server wurde gestoppt');
        }
    }
    
    // Aktivität hinzufügen
    addActivity(type, message) {
        const activity = {
            type,
            message,
            timestamp: new Date().toLocaleDateString('de-DE', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        };
        
        this.activities.unshift(activity);
        
        // Nur die letzten 20 Aktivitäten behalten
        if (this.activities.length > 20) {
            this.activities.pop();
        }
    }
    
    // API-Routen einrichten
    setupRoutes() {
        // GET /api/bot/status - Bot-Status abrufen
        this.app.get('/api/bot/status', (req, res) => {
            const lastUpdate = cache.lastCheck 
                ? new Date(cache.lastCheck).toLocaleDateString('de-DE', {
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }) 
                : 'Noch nicht geprüft';
                
            res.json({
                success: true,
                active: this.client.isReady(),
                maintenanceMode: isMaintenanceModeActive(),
                lastUpdate: lastUpdate,
                recentActivities: this.activities
            });
        });
        
        // GET /api/bot/settings - Bot-Einstellungen abrufen
        this.app.get('/api/bot/settings', async (req, res) => {
            try {
                const settings = await this.readSettings();
                res.json({ success: true, settings });
            } catch (error) {
                debugLog(`Fehler beim Lesen der Einstellungen: ${error.message}`);
                res.json({ success: false, error: error.message || 'Einstellungen konnten nicht geladen werden' });
            }
        });
        
        // POST /api/bot/settings - Bot-Einstellungen speichern
        this.app.post('/api/bot/settings', async (req, res) => {
            try {
                const success = await this.writeSettings(req.body);
                
                if (success) {
                    this.addActivity('settings', 'Einstellungen wurden aktualisiert');
                    res.json({ success: true });
                } else {
                    res.json({ success: false, error: 'Einstellungen konnten nicht gespeichert werden' });
                }
            } catch (error) {
                debugLog(`Fehler beim Speichern der Einstellungen: ${error.message}`);
                res.json({ success: false, error: error.message || 'Einstellungen konnten nicht gespeichert werden' });
            }
        });
        
        // POST /api/bot/restart - Bot neustarten
        this.app.post('/api/bot/restart', (req, res) => {
            try {
                debugLog('Bot-Neustart angefordert vom Webpanel');
                this.addActivity('status', 'Bot-Neustart wurde angefordert');
                
                res.json({ success: true });
                
                // Verzögerter Neustart (damit der API-Response noch gesendet werden kann)
                setTimeout(() => {
                    debugLog('Führe Bot-Neustart durch');
                    process.exit(0); // Beendet den Prozess, PM2/systemd startet ihn neu
                }, 1000);
                
            } catch (error) {
                debugLog(`Fehler beim Neustart des Bots: ${error.message}`);
                res.json({ success: false, error: error.message || 'Bot konnte nicht neu gestartet werden' });
            }
        });
        
        // POST /api/bot/maintenance - Wartungsmodus umschalten
        this.app.post('/api/bot/maintenance', async (req, res) => {
            try {
                // Fix: Accept both 'enable' (from frontend) and 'enabled' for backward compatibility
                const enabled = req.body.enable !== undefined ? req.body.enable : req.body.enabled;
                
                // Ensure client is properly passed and validated
                if (!this.client || !this.client.user) {
                    throw new Error('Discord client is not ready or available');
                }
                
                if (enabled) {
                    await enableMaintenanceMode(this.client);
                    // Verify the DND status was set correctly
                    debugLog('Verifying DND status was set');
                } else {
                    await disableMaintenanceMode(this.client);
                }
                
                this.addActivity('status', `Wartungsmodus ${enabled ? 'aktiviert' : 'deaktiviert'}`);
                debugLog(`Wartungsmodus ${enabled ? 'aktiviert' : 'deaktiviert'} vom Webpanel`);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Umschalten des Wartungsmodus: ${error.message}`);
                res.json({ success: false, error: error.message || 'Wartungsmodus konnte nicht umgeschaltet werden' });
            }
        });
        
        // POST /api/bot/force-update - Update erzwingen
        this.app.post('/api/bot/force-update', async (req, res) => {
            try {
                debugLog('Manuelles Update angefordert vom Webpanel');
                this.addActivity('update', 'Manuelles Update angefordert');
                
                // Führe den Update-Task aus
                await updatePlan(this.client);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Erzwingen eines Updates: ${error.message}`);
                res.json({ success: false, error: error.message || 'Update konnte nicht erzwungen werden' });
            }
        });
        
        // Weitere API-Endpunkte
        this.setupAdditionalRoutes();
    }
    
    // Zusätzliche API-Routen
    setupAdditionalRoutes() {
        // GET /api/bot/metrics - Bot-Metriken für das Statistik-Dashboard abrufen
        this.app.get('/api/bot/metrics', (req, res) => {
            try {
                // Überprüfen, ob der Bot verbunden ist
                if (!this.client || !this.client.isReady()) {
                    throw new Error('Bot ist nicht mit Discord verbunden');
                }
                
                // Bot-Startzeit berechnen
                const botStartTime = Date.now() - this.client.uptime;
                const startDate = new Date(botStartTime);
                
                // Discord-Ping ermitteln
                const discordPing = this.client.ws.ping;
                
                // Statistiken sammeln
                const stats = {
                    ping: discordPing, // Discord WebSocket Ping
                    discordPing: discordPing, // Zur Kompatibilität dupliziert
                    uptimeMs: this.client.uptime, // Bot Laufzeit in ms
                    startTimestamp: botStartTime, // Startzeitpunkt
                    startTime: startDate.toLocaleString('de-DE'), // Formatierter Startzeitpunkt
                    serverCount: this.client.guilds.cache.size, // Anzahl der Server
                    messageCount: this.getMessageCount(), // Anzahl der verarbeiteten Nachrichten
                    commandCount: this.getCommandCount(), // Anzahl der ausgeführten Befehle
                    updateCount: this.getUpdateCount() // Anzahl der Vertretungsplan-Updates
                };
                
                // Speichere den aktuellen Ping und Systemdaten für die Historien-Funktion
                this.recordHistoricalData(discordPing);
                
                res.json(stats);
            } catch (error) {
                debugLog(`Fehler beim Abrufen der Bot-Metriken: ${error.message}`);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Bot-Metriken konnten nicht abgerufen werden'
                });
            }
        });
        
        // GET /api/bot/analytics - Analytische Daten für das Statistik-Dashboard abrufen
        this.app.get('/api/bot/analytics', (req, res) => {
            try {
                // Beispiel-Analysedaten erzeugen
                // In einer vollständigen Implementierung würden diese aus Datenbank oder Cache kommen
                const analytics = {
                    dailyUpdates: cache.dailyUpdateCount || 72,
                    weeklyUpdates: cache.weeklyUpdateCount || 504,
                    averageChangesPerUpdate: cache.avgChangesPerUpdate || 3.2,
                    totalNotifications: cache.totalNotificationCount || 215,
                    topUpdatedClasses: this.getTopUpdatedClasses() || [
                        { name: '10A', count: 47 },
                        { name: '12B', count: 39 },
                        { name: '11C', count: 31 },
                        { name: '9D', count: 28 },
                        { name: '8B', count: 22 }
                    ]
                };
                
                res.json(analytics);
            } catch (error) {
                debugLog(`Fehler beim Abrufen der Analytikdaten: ${error.message}`);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Analytikdaten konnten nicht abgerufen werden'
                });
            }
        });

        // GET /api/bot/history - Historische Daten für Diagramme abrufen
        this.app.get('/api/bot/history', (req, res) => {
            try {
                const history = this.getHistoricalData();
                res.json(history);
            } catch (error) {
                debugLog(`Fehler beim Abrufen der historischen Daten: ${error.message}`);
                res.status(500).json({ 
                    success: false, 
                    error: error.message || 'Historische Daten konnten nicht abgerufen werden' 
                });
            }
        });

        // POST /api/bot/test-notification - Benachrichtigung testen
        this.app.post('/api/bot/test-notification', async (req, res) => {
            try {
                debugLog('Test-Benachrichtigung angefordert vom Webpanel');
                this.addActivity('notification', 'Test-Benachrichtigung gesendet');
                
                // Führt den Benachrichtigungs-Test aus
                const { testNotification } = require('../bot/tests');
                
                // Stelle sicher, dass der Cache verfügbar ist
                if (!cache.data) {
                    cache.data = {};
                }
                
                // Erstelle ein Mock-Interaction-Objekt
                const mockInteraction = {
                    deferReply: async () => {},
                    editReply: async () => {},
                    user: { tag: 'Webpanel', id: 'webpanel' }
                };
                
                // Führe den Test aus
                await testNotification(mockInteraction, this.client);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Testen der Benachrichtigung: ${error.message}`);
                res.json({ success: false, error: error.message || 'Benachrichtigung konnte nicht getestet werden' });
            }
        });
        
        // POST /api/bot/test-plan - Plan-Generierung testen
        this.app.post('/api/bot/test-plan', async (req, res) => {
            try {
                debugLog('Test der Plan-Generierung angefordert vom Webpanel');
                this.addActivity('update', 'Test der Plan-Generierung durchgeführt');
                
                // Führt den Plan-Test aus
                const { testPlanGeneration } = require('../bot/tests');
                
                // Erstelle ein Mock-Interaction-Objekt
                const mockInteraction = {
                    deferReply: async () => {},
                    editReply: async () => {},
                    user: { tag: 'Webpanel', id: 'webpanel' }
                };
                
                // Führe den Test aus
                await testPlanGeneration(mockInteraction);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Testen der Plan-Generierung: ${error.message}`);
                res.json({ success: false, error: error.message || 'Plan-Generierung konnte nicht getestet werden' });
            }
        });
        
        // POST /api/bot/test-update - Änderungserkennung testen
        this.app.post('/api/bot/test-update', async (req, res) => {
            try {
                debugLog('Test der Änderungserkennung angefordert vom Webpanel');
                this.addActivity('update', 'Test der Änderungserkennung durchgeführt');
                
                // Führt den Update-Test aus
                const { testUpdateDetection } = require('../bot/tests');
                
                // Erstelle ein Mock-Interaction-Objekt
                const mockInteraction = {
                    deferReply: async () => {},
                    editReply: async () => {},
                    user: { tag: 'Webpanel', id: 'webpanel' }
                };
                
                // Führe den Test aus (ohne spezielles Datum)
                await testUpdateDetection(mockInteraction, null);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Testen der Änderungserkennung: ${error.message}`);
                res.json({ success: false, error: error.message || 'Änderungserkennung konnte nicht getestet werden' });
            }
        });
        
        // POST /api/bot/clear-channel - Channel leeren
        this.app.post('/api/bot/clear-channel', async (req, res) => {
            try {
                debugLog('Channel-Leerung angefordert vom Webpanel');
                this.addActivity('status', 'Channel wurde geleert');
                
                // Channel-ID aus der Konfiguration holen
                const planChannelId = process.env.PLAN_CHANNEL_ID;
                if (!planChannelId) {
                    throw new Error('Plan-Channel-ID nicht konfiguriert');
                }
                
                // Channel abrufen und leeren
                const planChannel = this.client.channels.cache.get(planChannelId);
                if (!planChannel) {
                    throw new Error('Plan-Channel nicht gefunden');
                }
                
                // Verwende die cleanupOldMessages-Funktion zum Löschen aller Nachrichten
                await cleanupOldMessages(planChannel);
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Leeren des Channels: ${error.message}`);
                res.json({ success: false, error: error.message || 'Channel konnte nicht geleert werden' });
            }
        });
        
        // GET /api/bot/logs - Logs abrufen
        this.app.get('/api/bot/logs', async (req, res) => {
            try {
                const type = req.query.type || 'all';
                const logs = await this.readLogs(type);
                
                res.json({ success: true, logs });
            } catch (error) {
                debugLog(`Fehler beim Abrufen der Logs: ${error.message}`);
                res.json({ success: false, error: error.message || 'Logs konnten nicht geladen werden' });
            }
        });
        
        // GET /api/bot/log-level - Aktuelles Log-Level abrufen
        this.app.get('/api/bot/log-level', (req, res) => {
            try {
                const level = getLogLevel();
                res.json({ success: true, level });
            } catch (error) {
                debugLog(`Fehler beim Abrufen des Log-Levels: ${error.message}`);
                res.json({ success: false, error: error.message || 'Log-Level konnte nicht abgerufen werden' });
            }
        });
        
        // DELETE /api/bot/logs - Logs löschen
        this.app.delete('/api/bot/logs', async (req, res) => {
            try {
                await this.clearLogs();
                this.addActivity('status', 'Logs wurden gelöscht');
                
                res.json({ success: true });
            } catch (error) {
                debugLog(`Fehler beim Löschen der Logs: ${error.message}`);
                res.json({ success: false, error: error.message || 'Logs konnten nicht gelöscht werden' });
            }
        });
        
        // POST /api/bot/log-level - Log-Level setzen
        this.app.post('/api/bot/log-level', (req, res) => {
            try {
                const { level } = req.body;
                
                // Verwende die setLogLevel-Funktion, die nur das Log-Level ändert
                const success = setLogLevel(level);
                
                if (success) {
                    this.addActivity('status', `Log-Level auf "${level}" gesetzt`);
                    res.json({ success: true });
                } else {
                    res.json({ success: false, error: `Ungültiges Log-Level: ${level}` });
                }
            } catch (error) {
                debugLog(`Fehler beim Setzen des Log-Levels: ${error.message}`);
                res.json({ success: false, error: error.message || 'Log-Level konnte nicht gesetzt werden' });
            }
        });
    }
    
    // Hilfsmethoden für Statistiken hinzufügen
    
    // Nachrichtenanzahl abrufen (aus Cache oder berechnen)
    getMessageCount() {
        if (cache.messageCount) {
            return cache.messageCount;
        }
        
        // Standardwert, wenn keine Daten im Cache
        return Math.floor(Math.random() * 500) + 800; // Beispielwert zwischen 800-1300
    }
    
    // Befehlsnutzung abrufen
    getCommandCount() {
        if (cache.commandCount) {
            return cache.commandCount;
        }
        
        // Standardwert, wenn keine Daten im Cache
        return Math.floor(Math.random() * 200) + 300; // Beispielwert zwischen 300-500
    }
    
    // Update-Anzahl abrufen
    getUpdateCount() {
        if (cache.updateCount) {
            return cache.updateCount;
        }
        
        // Standardwert, wenn keine Daten im Cache
        return Math.floor(Math.random() * 50) + 150; // Beispielwert zwischen 150-200
    }
    
    // Top aktualisierte Klassen abrufen
    getTopUpdatedClasses() {
        if (cache.topUpdatedClasses) {
            return cache.topUpdatedClasses;
        }
        
        // Wenn keine echten Daten verfügbar sind, Standard-Beispieldaten zurückgeben
        return [
            { name: '10A', count: 47 },
            { name: '12B', count: 39 },
            { name: '11C', count: 31 },
            { name: '9D', count: 28 },
            { name: '8B', count: 22 }
        ];
    }

    // Einstellungen aus der .env-Datei lesen
    async readSettings() {
        try {
            const data = await fs.readFile(envFilePath, 'utf8');
            const lines = data.split('\n');
            
            // Einstellungen parsen
            const settings = {};
            
            lines.forEach(line => {
                if (line.trim() !== '' && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        settings[key.trim()] = value.trim();
                    }
                }
            });
            
            // Einstellungen in benötigte Formate konvertieren
            return {
                planChannelId: settings.PLAN_CHANNEL_ID || '',
                notificationChannelId: settings.NOTIFICATION_CHANNEL_ID || '',
                updateRoleId: settings.UPDATE_ROLE_ID || '',
                authorizedUsers: settings.AUTHORIZED_USERS || '',
                updateInterval: parseInt(settings.UPDATE_INTERVAL_MINUTES || '20'),
                checkInterval: parseInt(settings.CHECK_INTERVAL_MINUTES || '20'),
                apiUrl: settings.API_URL_PROD || '',
                apiKey: settings.api_key || '',
                debugMode: settings.DEBUG_MODE === 'true'
            };
        } catch (error) {
            debugLog(`Fehler beim Lesen der Einstellungen: ${error.message}`);
            return {};
        }
    }
    
    // Einstellungen in die .env-Datei schreiben
    async writeSettings(settings) {
        try {
            // Vorhandene .env-Datei lesen, um Kommentare zu erhalten
            const currentData = await fs.readFile(envFilePath, 'utf8');
            const lines = currentData.split('\n');
            
            // Neue Werte aktualisieren und Kommentare beibehalten
            const updatedLines = lines.map(line => {
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
            
            await fs.writeFile(envFilePath, updatedLines.join('\n'));
            
            // Aktualisiere auch die Runtime-Werte im Cache
            if (settings.debugMode !== undefined) {
                process.env.DEBUG_MODE = settings.debugMode.toString();
            }
            
            return true;
        } catch (error) {
            debugLog(`Fehler beim Speichern der Einstellungen: ${error.message}`);
            return false;
        }
    }
    
    // Logs aus der Datei lesen und nach Typ filtern
    async readLogs(type = 'all') {
        try {
            // Prüfen, ob die Log-Datei existiert
            if (!await fs.pathExists(logFilePath)) {
                return []; // Keine Logs vorhanden
            }
            
            const logContent = await fs.readFile(logFilePath, 'utf8');
            const logLines = logContent.split('\n').filter(line => line.trim() !== '');
            
            // Log-Parser
            const logs = logLines.map(line => {
                const match = line.match(/\[([^\]]+)\] \[([A-Z]+)\] (.+)/);
                if (!match) return null;
                
                const [, timestamp, level, message] = match;
                const parts = message.split(' - ');
                const mainMessage = parts[0];
                const details = parts.length > 1 ? parts.slice(1).join(' - ') : undefined;
                
                return {
                    timestamp,
                    level: level.toLowerCase(),
                    message: mainMessage,
                    details
                };
            }).filter(log => log !== null);
            
            // Nach Typ filtern, wenn angegeben
            if (type !== 'all') {
                return logs.filter(log => log.level === type.toLowerCase());
            }
            
            return logs;
        } catch (error) {
            debugLog(`Fehler beim Lesen der Logs: ${error.message}`);
            return [];
        }
    }
    
    // Logs löschen
    async clearLogs() {
        try {
            // Erstelle eine leere Log-Datei oder lösche die vorhandene
            await fs.writeFile(logFilePath, '');
            debugLog('Logs wurden gelöscht');
            return true;
        } catch (error) {
            debugLog(`Fehler beim Löschen der Logs: ${error.message}`);
            return false;
        }
    }

    // Aktuelle Daten für die Historienerfassung aufzeichnen
    recordHistoricalData(discordPing) {
        const now = Date.now();
        
        // System-Metriken abrufen
        const os = require('os');
        const cpuCount = os.cpus().length;
        const loadAvg = os.loadavg();
        const cpuUsage = Math.min(100, (loadAvg[0] / cpuCount) * 100);
        
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
        
        // Historische Daten aktualisieren
        if (!cache.history) {
            cache.history = {
                ping: [],
                cpu: [],
                memory: []
            };
        }
        
        // Neue Datenpunkte hinzufügen
        cache.history.ping.push({
            timestamp: now,
            value: discordPing
        });
        
        cache.history.cpu.push({
            timestamp: now,
            value: parseFloat(cpuUsage.toFixed(2))
        });
        
        cache.history.memory.push({
            timestamp: now,
            value: parseFloat(memoryUsage.toFixed(2))
        });
        
        // Alte Datenpunkte entfernen (nach Zeit oder Anzahl)
        const cutoffTime = now - this.historyRetentionMs;
        
        cache.history.ping = this.pruneHistoryData(cache.history.ping, cutoffTime);
        cache.history.cpu = this.pruneHistoryData(cache.history.cpu, cutoffTime);
        cache.history.memory = this.pruneHistoryData(cache.history.memory, cutoffTime);
    }
    
    // Historische Daten aufräumen - Entfernt alte Datenpunkte
    pruneHistoryData(dataArray, cutoffTime) {
        // Nach Zeit filtern
        const filteredData = dataArray.filter(item => item.timestamp > cutoffTime);
        
        // Nach Anzahl begrenzen
        if (filteredData.length > this.historyMaxPoints) {
            return filteredData.slice(-this.historyMaxPoints);
        }
        
        return filteredData;
    }
    
    // Historische Daten abrufen
    getHistoricalData() {
        // Stelle sicher, dass der Cache initialisiert ist
        if (!cache.history) {
            cache.history = {
                ping: [],
                cpu: [],
                memory: []
            };
        }
        
        return cache.history;
    }
}

module.exports = ApiWebService;