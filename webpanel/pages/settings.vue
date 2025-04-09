<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 md:mb-6">Einstellungen</h1>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-4 md:mb-8 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Allgemeine Konfiguration</h2>
      
      <form @submit.prevent="saveSettings" class="space-y-4 md:space-y-6">
        <!-- Discord Konfiguration -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-2 md:mb-3">Discord Konfiguration</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Plan Channel ID</label>
              <input v-model="settings.planChannelId" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Channel ID für den Vertretungsplan" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Notification Channel ID</label>
              <input v-model="settings.notificationChannelId" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Channel ID für Benachrichtigungen" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Update Role ID</label>
              <input v-model="settings.updateRoleId" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Rollen-ID für Updates" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Authorized Users</label>
              <input v-model="settings.authorizedUsers" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Discord IDs, durch Kommas getrennt" />
            </div>
          </div>
        </div>
        
        <!-- Zeitintervalle -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-2 md:mb-3">Zeitintervalle</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Update Interval (Min)</label>
              <input v-model.number="settings.updateInterval" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Wie oft der Plan aktualisiert werden soll</p>
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Check Interval (Min)</label>
              <input v-model.number="settings.checkInterval" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Wie oft auf Änderungen geprüft werden soll</p>
            </div>
          </div>
        </div>
        
        <!-- API Konfiguration -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-2 md:mb-3">API Konfiguration</h3>
          <div class="grid grid-cols-1 gap-3 md:gap-4">
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">API URL</label>
              <input v-model="settings.apiUrl" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="URL zur Vertretungsplan-API" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input v-model="settings.apiKey" type="password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••" />
            </div>
          </div>
        </div>
        
        <!-- Debug Modus -->
        <div>
          <div class="flex items-center">
            <AnimatedToggle
              v-model="settings.debugMode"
              id="debugMode"
              label="Debug-Modus aktivieren"
            />
          </div>
          <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Im Debug-Modus werden ausführliche Discord Nachrichten angezeigt und Test-Befehle freigeschaltet</p>
        </div>
        
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 dark:border-gray-700 gap-3">
          <button type="button" @click="resetSettings" class="order-2 sm:order-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm">
            Zurücksetzen
          </button>
          <button type="submit" class="order-1 sm:order-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Einstellungen speichern
          </button>
        </div>
      </form>
    </div>
    
    <!-- Bot Neustart -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-2 md:mb-4 dark:text-white">Bot Neustart</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Ein Neustart kann helfen, wenn der Bot nicht mehr ordnungsgemäß funktioniert oder nach Änderungen an den Einstellungen.
      </p>
      <div class="flex">
        <button @click="restartBot" class="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition">
          Bot neustarten
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import useToast from '../composables/useToast';
import AnimatedToggle from '../components/AnimatedToggle.vue';

// Einstellungen
const settings = ref({
  planChannelId: '',
  notificationChannelId: '',
  updateRoleId: '',
  authorizedUsers: '',
  updateInterval: 20,
  checkInterval: 20,
  apiUrl: '',
  apiKey: '',
  debugMode: false,
});

const originalSettings = ref({});
const { showToast } = useToast();

// Einstellungen laden
const loadSettings = async () => {
  try {
    const response = await fetch('/api/bot/settings');
    const data = await response.json();
    if (data.success) {
      settings.value = { ...data.settings };
      originalSettings.value = { ...data.settings };
      settings.value.apiPing = data.settings.apiPing || null; // Add apiPing
      settings.value.discordPing = data.settings.discordPing || null; // Add discordPing
    } else {
      showToast('Fehler beim Laden der Einstellungen: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Fehler beim Laden der Einstellungen:', error);
    showToast('Fehler beim Laden der Einstellungen: ' + error.message, 'error');
  }
};

// Einstellungen speichern
const saveSettings = async () => {
  try {
    const response = await fetch('/api/bot/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings.value)
    });
    const data = await response.json();
    if (data.success) {
      showToast('Einstellungen wurden erfolgreich gespeichert', 'success');
      // Originale Einstellungen aktualisieren
      originalSettings.value = { ...settings.value };
    } else {
      showToast('Fehler beim Speichern der Einstellungen: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Speichern der Einstellungen: ' + error.message, 'error');
  }
};

// Einstellungen zurücksetzen
const resetSettings = () => {
  settings.value = { ...originalSettings.value };
  showToast('Einstellungen zurückgesetzt', 'info');
};

// Bot neustarten
const restartBot = async () => {
  if (confirm('Möchtest du den Bot wirklich neustarten?')) {
    try {
      const response = await fetch('/api/bot/restart', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        showToast('Bot wird neugestartet...', 'success');
      } else {
        showToast('Fehler beim Neustarten des Bots: ' + data.error, 'error');
      }
    } catch (error) {
      showToast('Fehler beim Neustarten des Bots: ' + error.message, 'error');
    }
  }
};

// Beim Laden der Seite die Einstellungen abrufen
onMounted(() => {
  loadSettings();
});
</script>