/**
 * Hauptdatei für den Vertretungsplan Discord Bot
 */
const { Client } = require('discord.js');
const { CLIENT_CONFIG, DEBUG } = require('./src/config');
const { setupHandlers } = require('./src/bot/handlers');
const { debugLog, infoLog, errorLog } = require('./src/utils/debugUtils');
const ApiWebService = require('./src/services/apiWebService');
const AppwriteService = require('./src/services/appwriteService');

// Debug-Modus Status ausgeben
console.log('🔄 Bot wird gestartet...');
if (DEBUG) {
    console.log('🔍 DEBUG-MODUS AKTIV');
}

async function initializeBot() {
    try {
        console.log('📝 Initialisiere Bot...');
        
        // Prüfe Appwrite-Umgebungsvariablen
        const requiredAppwriteVars = ['APPWRITE_ENDPOINT', 'APPWRITE_PROJECT_ID', 'APPWRITE_API_KEY'];
        console.log('🔍 Prüfe Appwrite-Konfiguration...');
        
        const missingAppwriteVars = requiredAppwriteVars.filter(key => !process.env[key]);
        
        if (missingAppwriteVars.length > 0) {
            console.error('❌ Fehlende Appwrite-Konfiguration:');
            missingAppwriteVars.forEach(key => console.error(`   - ${key} fehlt`));
            throw new Error('Appwrite-Konfiguration unvollständig');
        }

        console.log('✅ Appwrite-Konfiguration gefunden');
        console.log(`📍 APPWRITE_ENDPOINT: ${process.env.APPWRITE_ENDPOINT}`);
        console.log(`🆔 APPWRITE_PROJECT_ID: ${process.env.APPWRITE_PROJECT_ID}`);
        console.log('🔑 APPWRITE_API_KEY: [versteckt]');

        // Appwrite Service initialisieren
        console.log('🚀 Initialisiere Appwrite Service...');
        let appwriteService;
        try {
            appwriteService = new AppwriteService();
            console.log('✅ Appwrite Service erfolgreich initialisiert');
        } catch (appwriteError) {
            console.error('❌ Fehler bei der Initialisierung des Appwrite Service:');
            console.error(appwriteError.message);
            throw appwriteError;
        }

        // Verbindung zu Appwrite testen
        console.log('🔄 Teste Verbindung zu Appwrite...');
        const isConnected = await appwriteService.testConnection();
        if (!isConnected) {
            console.error('❌ Keine Verbindung zu Appwrite möglich');
            throw new Error('Keine Verbindung zu Appwrite möglich');
        }
        console.log('✅ Verbindung zu Appwrite hergestellt');

        // Einstellungen aus Appwrite laden
        console.log('📥 Lade Einstellungen aus Appwrite...');
        const settings = await appwriteService.getAllSettings();
        console.log('✅ Einstellungen aus Appwrite geladen');
        console.log('📋 Verfügbare Einstellungen:', Object.keys(settings).join(', '));

        if (Object.keys(settings).length === 0) {
            console.error('❌ Keine Einstellungen in Appwrite gefunden!');
            throw new Error('Keine Einstellungen verfügbar');
        }

        // Prüfen ob notwendige Einstellungen vorhanden sind
        const requiredSettings = ['DISCORD_TOKEN', 'API_URL'];
        const missingSettings = requiredSettings.filter(key => !settings[key]);
        
        if (missingSettings.length > 0) {
            console.error(`❌ Fehlende erforderliche Einstellungen: ${missingSettings.join(', ')}`);
            console.log('📋 Aktuelle Einstellungen:', JSON.stringify(settings, null, 2));
            throw new Error('Fehlende Einstellungen');
        }

        // Umgebungsvariablen mit den Einstellungen aus Appwrite aktualisieren
        console.log('🔄 Aktualisiere Umgebungsvariablen...');
        Object.entries(settings).forEach(([key, value]) => {
            if (!key.startsWith('APPWRITE_')) {
                process.env[key] = value;
                console.log(`✅ ${key}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
            }
        });

        // Überprüfen ob die Einstellungen korrekt in process.env sind
        requiredSettings.forEach(key => {
            debugLog(`Überprüfe ${key} in process.env: ${process.env[key] ? 'Vorhanden' : 'Fehlt'}`);
            if (!process.env[key]) {
                throw new Error(`Einstellung ${key} konnte nicht in process.env gesetzt werden`);
            }
        });

        // Discord Client erstellen
        const client = new Client(CLIENT_CONFIG);
        debugLog('Discord Client erstellt mit Intents: ' + JSON.stringify(CLIENT_CONFIG.intents));

        // Event-Handler einrichten
        setupHandlers(client, appwriteService);
        debugLog('Bot-Handler wurden eingerichtet');

        // API Web Service für das Webpanel initialisieren
        let apiService;

        // Bot einloggen
        try {
            await client.login(process.env.DISCORD_TOKEN);
            infoLog('Bot angemeldet');
            debugLog('Bot erfolgreich angemeldet');
        } catch (loginError) {
            errorLog(`Login fehlgeschlagen: ${loginError.message}`);
            debugLog(`Verwendeter Token: ${process.env.DISCORD_TOKEN ? process.env.DISCORD_TOKEN.substring(0, 10) + '...' : 'nicht vorhanden'}`);
            throw loginError;
        }
        
        // API-Server nach erfolgreicher Anmeldung starten
        apiService = new ApiWebService(client, { ...require('./src/config'), settings });
        apiService.setAppwriteService(appwriteService);
        apiService.start();

        // Event-Listener für Prozessbeendigung
        process.on('SIGINT', () => {
            infoLog('Bot wird durch SIGINT beendet');
            
            // API-Server stoppen, falls vorhanden
            if (apiService) {
                apiService.stop();
            }
            
            process.exit(0);
        });
        
        process.on('SIGTERM', () => {
            infoLog('Bot wird durch SIGTERM beendet');
            
            // API-Server stoppen, falls vorhanden
            if (apiService) {
                apiService.stop();
            }
            
            process.exit(0);
        });

    } catch (error) {
        console.error('❌ Fehler bei der Initialisierung:');
        console.error(error.message);
        if (error.stack) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

// Fehlerbehandlung für unerwartete Fehler
process.on('unhandledRejection', error => {
    console.error('❌ KRITISCH: Unbehandelter Promise-Fehler:');
    console.error(error.message);
    if (error.stack) {
        console.error(error.stack);
    }
});

// Zusätzliche Debug-Informationen
if (DEBUG) {
    debugLog(`Node.js Version: ${process.version}`);
    debugLog(`Plattform: ${process.platform} (${process.arch})`);
    debugLog(`Arbeitsspeicher: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
}

// Bot starten
initializeBot();