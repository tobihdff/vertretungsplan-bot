const { Client, Databases, Query } = require('node-appwrite');
const { debugLog, errorLog } = require('../utils/debugUtils');
const fs = require('fs-extra');
const path = require('path');

class AppwriteService {
    constructor(config) {
        if (!process.env.APPWRITE_ENDPOINT || !process.env.APPWRITE_PROJECT_ID || !process.env.APPWRITE_API_KEY) {
            errorLog('Fehlende Appwrite Konfiguration!');
            errorLog(`APPWRITE_ENDPOINT: ${process.env.APPWRITE_ENDPOINT ? 'Vorhanden' : 'Fehlt'}`);
            errorLog(`APPWRITE_PROJECT_ID: ${process.env.APPWRITE_PROJECT_ID ? 'Vorhanden' : 'Fehlt'}`);
            errorLog(`APPWRITE_API_KEY: ${process.env.APPWRITE_API_KEY ? 'Vorhanden' : 'Fehlt'}`);
            throw new Error('Appwrite Konfiguration unvollständig');
        }

        this.client = new Client()
            .setEndpoint(process.env.APPWRITE_ENDPOINT)
            .setProject(process.env.APPWRITE_PROJECT_ID)
            .setKey(process.env.APPWRITE_API_KEY);

        this.databases = new Databases(this.client);
        this.databaseId = 'vertretungsplan_bot';
        this.settingsCollection = 'settings';
        
        debugLog(`AppwriteService initialisiert mit:`);
        debugLog(`- Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
        debugLog(`- Project ID: ${process.env.APPWRITE_PROJECT_ID}`);
        debugLog(`- Database ID: ${this.databaseId}`);
        debugLog(`- Collection: ${this.settingsCollection}`);
    }

    async testConnection() {
        try {
            debugLog('Teste Verbindung zu Appwrite...');
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.settingsCollection
            );
            debugLog('Verbindung zu Appwrite erfolgreich!');
            debugLog(`Gefundene Dokumente: ${response.total}`);
            return true;
        } catch (error) {
            errorLog('Verbindung zu Appwrite fehlgeschlagen!');
            errorLog(`Fehler: ${error.message}`);
            if (error.code) {
                errorLog(`Appwrite Fehlercode: ${error.code}`);
            }
            return false;
        }
    }

    async getSetting(key) {
        try {
            debugLog(`Lade Einstellung: ${key}`);
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.settingsCollection,
                [
                    Query.equal('setting_key', key)
                ]
            );

            debugLog(`Gefundene Dokumente für ${key}: ${response.documents.length}`);

            if (response.documents.length > 0) {
                const value = response.documents[0].value;
                debugLog(`Wert für ${key} gefunden: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
                return value;
            }
            
            const envValue = process.env[key];
            debugLog(`Kein Wert in Appwrite gefunden für ${key}, Fallback auf env: ${envValue ? 'Wert vorhanden' : 'Kein Wert'}`);
            return envValue || null;
        } catch (error) {
            errorLog(`Fehler beim Abrufen der Einstellung ${key}: ${error.message}`);
            const envValue = process.env[key];
            debugLog(`Fehler aufgetreten, Fallback auf env für ${key}: ${envValue ? 'Wert vorhanden' : 'Kein Wert'}`);
            return envValue || null;
        }
    }

    async getAllSettings() {
        try {
            debugLog('Lade alle Einstellungen aus Appwrite...');
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.settingsCollection
            );
            
            debugLog(`${response.documents.length} Einstellungen gefunden`);
            
            const settings = response.documents.reduce((acc, doc) => {
                debugLog(`Verarbeite Einstellung: ${doc.setting_key} = ${doc.value.substring(0, 30)}${doc.value.length > 30 ? '...' : ''}`);
                acc[doc.setting_key] = doc.value;
                return acc;
            }, {});

            debugLog('Geladene Einstellungen:', Object.keys(settings).join(', '));
            return settings;
        } catch (error) {
            errorLog(`Fehler beim Abrufen aller Einstellungen: ${error.message}`);
            if (error.code) {
                errorLog(`Appwrite Fehlercode: ${error.code}`);
            }
            return {};
        }
    }

    async reloadSettings() {
        try {
            debugLog('Lade Einstellungen neu...');
            const settings = await this.getAllSettings();
            
            // Aktualisiere process.env mit den neuen Einstellungen
            Object.entries(settings).forEach(([key, value]) => {
                if (!key.startsWith('APPWRITE_')) {
                    const oldValue = process.env[key];
                    process.env[key] = value;
                    if (oldValue !== value) {
                        debugLog(`Einstellung ${key} aktualisiert: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`);
                    }
                }
            });
            
            debugLog('Einstellungen erfolgreich neu geladen');
            return true;
        } catch (error) {
            errorLog(`Fehler beim Neuladen der Einstellungen: ${error.message}`);
            return false;
        }
    }

    async setSetting(key, value) {
        try {
            debugLog(`Speichere Einstellung: ${key}`);
            const response = await this.databases.listDocuments(
                this.databaseId,
                this.settingsCollection,
                [
                    Query.equal('setting_key', key)
                ]
            );

            if (response.documents.length > 0) {
                debugLog(`Aktualisiere existierende Einstellung: ${key}`);
                await this.databases.updateDocument(
                    this.databaseId,
                    this.settingsCollection,
                    response.documents[0].$id,
                    {
                        value: value
                    }
                );
            } else {
                debugLog(`Erstelle neue Einstellung: ${key}`);
                await this.databases.createDocument(
                    this.databaseId,
                    this.settingsCollection,
                    'unique()',
                    {
                        setting_key: key,
                        value: value
                    }
                );
            }
            debugLog(`Einstellung ${key} erfolgreich gespeichert`);
            return true;
        } catch (error) {
            errorLog(`Fehler beim Speichern der Einstellung ${key}: ${error.message}`);
            if (error.code) {
                errorLog(`Appwrite Fehlercode: ${error.code}`);
            }
            return false;
        }
    }

    async migrateEnvSettings() {
        try {
            debugLog('Starte Migration der Einstellungen von .env nach Appwrite...');
            
            // Prüfe ob bereits Einstellungen in Appwrite existieren
            const existingSettings = await this.getAllSettings();
            debugLog(`Gefundene existierende Einstellungen: ${Object.keys(existingSettings).join(', ')}`);
            
            if (Object.keys(existingSettings).length > 0) {
                debugLog('Einstellungen existieren bereits in Appwrite, überspringe Migration');
                return true;
            }

            // .env Datei einlesen
            const envPath = path.join(process.cwd(), '.env');
            
            // Prüfen ob .env Datei existiert
            if (!await fs.pathExists(envPath)) {
                debugLog('.env Datei nicht gefunden, überspringe Migration');
                return true;
            }

            const envContent = await fs.readFile(envPath, 'utf8');
            const envLines = envContent.split('\n');

            let migratedCount = 0;
            // Einstellungen parsen und in Appwrite speichern
            for (const line of envLines) {
                if (line.trim() !== '' && !line.startsWith('#')) {
                    const [key, value] = line.split('=');
                    if (key && value) {
                        const trimmedKey = key.trim();
                        const trimmedValue = value.trim();

                        // Ignoriere Appwrite-spezifische Einstellungen
                        if (!trimmedKey.startsWith('APPWRITE_')) {
                            await this.setSetting(trimmedKey, trimmedValue);
                            debugLog(`Migrierte Einstellung: ${trimmedKey}`);
                            migratedCount++;
                        }
                    }
                }
            }

            debugLog(`Migration der Einstellungen erfolgreich abgeschlossen (${migratedCount} Einstellungen migriert)`);
            return true;
        } catch (error) {
            errorLog(`Fehler bei der Migration der Einstellungen: ${error.message}`);
            if (error.code) {
                errorLog(`Appwrite Fehlercode: ${error.code}`);
            }
            return false;
        }
    }
}

module.exports = AppwriteService; 