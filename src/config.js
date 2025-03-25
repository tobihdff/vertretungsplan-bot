require('dotenv').config();

// Discord Client Konfiguration
const CLIENT_CONFIG = { 
    intents: [
        require('discord.js').GatewayIntentBits.Guilds,
        require('discord.js').GatewayIntentBits.GuildMessages,
        require('discord.js').GatewayIntentBits.MessageContent,
        require('discord.js').GatewayIntentBits.GuildMembers
    ] 
};

// Channel IDs und Rollen-IDs
const PLAN_CHANNEL_ID = process.env.PLAN_CHANNEL_ID;
const NOTIFICATION_CHANNEL_ID = process.env.NOTIFICATION_CHANNEL_ID;
const UPDATE_ROLE_ID = process.env.UPDATE_ROLE_ID;

// Debug-Modus aus Umgebungsvariable lesen
const DEBUG = process.env.DEBUG_MODE == 'true';

// Intervalle konfigurierbar in Minuten, umgerechnet in Millisekunden
const INTERVALS = {
    // Intervall für reguläre Vertretungsplan-Updates 
    UPDATE_INTERVAL: parseInt(process.env.UPDATE_INTERVAL_MINUTES || '20') * 60 * 1000,
    
    // Intervall für die Überprüfung auf Änderungen
    CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL_MINUTES || '10') * 60 * 1000,
    
    // Intervall für die Überprüfung der API-Erreichbarkeit im Fehlerfall (1 Minute)
    API_RETRY_INTERVAL: parseInt(process.env.API_RETRY_INTERVAL_MINUTES || '1') * 60 * 1000
};

// Liste der autorisierten Benutzer-IDs für Tests
const AUTHORIZED_USERS = process.env.AUTHORIZED_USERS ? process.env.AUTHORIZED_USERS.split(',') : [];

// API-Konfiguration
const BASE_URL = process.env.NODE_ENV === 'development' ? process.env.API_URL_DEV : process.env.API_URL_PROD;
const API_KEY = process.env.api_key;

// Bild-Konfiguration
const IMAGE_CONFIG = {
    width: 1050,
    marginX: 40,
    marginY: 60,
    cardHeight: 60,
    cardGap: 16,
    footerHeight: 80,
    cardRadius: 12,
    headerHeight: 70,
    numRows: 8,
    fonts: {
        normal: '20px "Segoe UI", sans-serif',
        title: 'bold 28px "Segoe UI", sans-serif',
        small: '18px "Segoe UI", sans-serif',
        bold: 'bold 20px "Segoe UI", sans-serif'
    },
    status: {
        normal: { bg: '#dff4e1', text: '#155724' },
        vertretung: { bg: '#fff4cc', text: '#856404' },
        entfall: { bg: '#f8d7da', text: '#721c24' }
    }
};

// Cache für Bot-Daten
const cache = {
    lastMessageId: null,
    lastData: null,
    lastCheck: null, // Zeitpunkt der letzten Überprüfung
    initialized: false, // Flag für die Erstinitialisierung
    apiAvailable: true, // Flag für API-Erreichbarkeit
    statusChanged: false, // Flag ob der Status geändert wurde
    apiFailureCount: 0 // Zähler für fehlgeschlagene API-Anfragen
};

// Bot-Status Konfiguration
const BOT_STATUS = {
    ACTIVITY: {
        name: 'Vertretungsplan',
        type: 'WATCHING' // Discord.js ActivityType.Watching
    },
    PRESENCE: {
        ONLINE: 'online',
        DND: 'dnd' // Do Not Disturb
    }
};

module.exports = {
    CLIENT_CONFIG,
    PLAN_CHANNEL_ID,
    NOTIFICATION_CHANNEL_ID,
    UPDATE_ROLE_ID,
    INTERVALS,
    AUTHORIZED_USERS,
    BASE_URL,
    API_KEY,
    IMAGE_CONFIG,
    cache,
    DEBUG,
    BOT_STATUS
};
