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
              <input v-model="settings.PLAN_CHANNEL_ID" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Channel ID für den Vertretungsplan" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Notification Channel ID</label>
              <input v-model="settings.NOTIFICATION_CHANNEL_ID" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Channel ID für Benachrichtigungen" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Update Role ID</label>
              <input v-model="settings.UPDATE_ROLE_ID" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Rollen-ID für Updates" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Authorized Users</label>
              <input v-model="settings.AUTHORIZED_USERS" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="Discord IDs, durch Kommas getrennt" />
            </div>
          </div>
        </div>
        
        <!-- Zeitintervalle -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-2 md:mb-3">Zeitintervalle</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Update Interval (Min)</label>
              <input v-model.number="settings.UPDATE_INTERVAL_MINUTES" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
              <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">Wie oft der Plan aktualisiert werden soll</p>
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">Check Interval (Min)</label>
              <input v-model.number="settings.CHECK_INTERVAL_MINUTES" type="number" min="1" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" />
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
              <input v-model="settings.API_URL" type="text" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="URL zur Vertretungsplan-API" />
            </div>
            <div class="col-span-1">
              <label class="block text-sm text-gray-700 dark:text-gray-300 mb-1">API Key</label>
              <input v-model="settings.API_KEY" type="password" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm" placeholder="•••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••" />
            </div>
          </div>
        </div>
        
        <!-- Debug Modus -->
        <div>
          <div class="flex items-center">
            <AnimatedToggle
              v-model="settings.DEBUG_MODE"
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

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import useToast from '../composables/useToast'
import AnimatedToggle from '../components/AnimatedToggle.vue'
import { useApi, type BotSettings, type ApiResponse } from '../composables/useApi'

definePageMeta({
  middleware: ['auth']
})

const { showToast } = useToast();
const { getBotSettings, updateBotSettings } = useApi();

const settings = ref<BotSettings>({
  PLAN_CHANNEL_ID: '',
  NOTIFICATION_CHANNEL_ID: '',
  UPDATE_ROLE_ID: '',
  AUTHORIZED_USERS: '',
  UPDATE_INTERVAL_MINUTES: '',
  CHECK_INTERVAL_MINUTES: '',
  API_URL: '',
  API_KEY: '',
  DEBUG_MODE: ''
});

const originalSettings = ref<BotSettings | null>(null);
const loading = ref(false);
const saving = ref(false);

const fetchSettings = async () => {
  loading.value = true;
  try {
    const response = await getBotSettings();
    if (response.success && response.data) {
      settings.value = response.data;
      originalSettings.value = { ...response.data };
    } else {
      showToast('Error loading settings: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showToast('Error loading settings: ' + errorMessage, 'error');
  } finally {
    loading.value = false;
  }
};

const saveSettings = async () => {
  saving.value = true;
  try {
    const response = await updateBotSettings(settings.value);
    if (response.success) {
      showToast('Settings saved successfully', 'success');
      originalSettings.value = { ...settings.value };
    } else {
      showToast('Error saving settings: ' + (response.error || 'Unknown error'), 'error');
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    showToast('Error saving settings: ' + errorMessage, 'error');
  } finally {
    saving.value = false;
  }
};

const hasChanges = computed(() => {
  if (!originalSettings.value) return false;
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value);
});

const resetSettings = () => {
  settings.value = { ...originalSettings.value };
  showToast('Einstellungen zurückgesetzt', 'info');
};

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

onMounted(() => {
  fetchSettings();
});

defineExpose({
  settings,
  loading,
  saving,
  hasChanges,
  saveSettings
});
</script>