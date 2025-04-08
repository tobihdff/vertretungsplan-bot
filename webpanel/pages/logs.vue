<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 md:mb-6">Logs</h1>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6 transition-colors duration-300">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 class="text-lg font-semibold dark:text-white">Logdateien</h2>
        <div class="flex space-x-2">
          <select v-model="selectedLogType" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            <option value="all">Alle Logs</option>
            <option value="info">Info</option>
            <option value="error">Fehler</option>
            <option value="debug">Debug</option>
          </select>
          <button @click="refreshLogs" class="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
            Aktualisieren
          </button>
        </div>
      </div>
      
      <div class="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
        <div class="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-3 py-2 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
          <div class="flex flex-wrap gap-2 sm:gap-4">
            <span class="text-xs sm:text-sm font-medium dark:text-gray-200">Zeilen: {{ logEntries.length }}</span>
            <span class="text-xs sm:text-sm font-medium dark:text-gray-200">Filter: {{ selectedLogType }}</span>
          </div>
          <button @click="downloadLogs" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm">
            Download
          </button>
        </div>
        
        <div v-if="loading" class="flex justify-center items-center p-6 sm:p-10 dark:bg-gray-900">
          <div class="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        
        <div v-else class="bg-black text-white p-3 sm:p-4 max-h-[40vh] sm:max-h-[60vh] overflow-auto font-mono text-xs sm:text-sm">
          <div v-if="logEntries.length === 0" class="text-gray-400 text-center py-4">
            Keine Logs gefunden
          </div>
          <div v-for="(entry, index) in logEntries" :key="index" class="pb-2 border-b border-gray-700 last:border-0 mb-2 break-words">
            <div :class="{
              'text-green-400': entry.level === 'info',
              'text-red-400': entry.level === 'error',
              'text-yellow-400': entry.level === 'debug',
              'text-blue-400': entry.level === 'system'
            }">
              <div class="flex flex-wrap">
                <span class="mr-2">[{{ entry.timestamp }}]</span>
                <span class="mr-2">[{{ entry.level.toUpperCase() }}]</span>
              </div>
              <span>{{ entry.message }}</span>
            </div>
            <div v-if="entry.details" class="text-gray-400 mt-1 pl-2 sm:pl-4 text-xs sm:text-sm break-all">
              {{ entry.details }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Log-Verwaltung -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-2 md:mb-4 dark:text-white">Log-Verwaltung</h2>
      <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
        Verwalten Sie Ihre Log-Dateien. Beachten Sie, dass das Löschen von Logs nicht rückgängig gemacht werden kann.
      </p>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <button @click="clearLogs" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm">
          Logs löschen
        </button>
        <button @click="setLogLevel('info')" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm">
          Info-Level
        </button>
        <button @click="setLogLevel('debug')" class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition text-sm">
          Debug-Level
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import useToast from '../composables/useToast';

// Zustandsvariablen
const logEntries = ref([]);
const loading = ref(false);
const selectedLogType = ref('all');
const { showToast } = useToast();

// Logs laden
const loadLogs = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/bot/logs?type=${selectedLogType.value}`);
    const data = await response.json();
    if (data.success) {
      logEntries.value = data.logs;
    } else {
      showToast('Fehler beim Laden der Logs: ' + data.error, 'error');
      logEntries.value = [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der Logs:', error);
    showToast('Fehler beim Laden der Logs: ' + error.message, 'error');
    logEntries.value = [];
  } finally {
    loading.value = false;
  }
};

// Logs aktualisieren
const refreshLogs = () => {
  loadLogs();
};

// Logs herunterladen
const downloadLogs = () => {
  // Log-Einträge in einen String umwandeln
  const logText = logEntries.value.map(entry => 
    `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${entry.details ? '\n' + entry.details : ''}`
  ).join('\n\n');
  
  // Blob erstellen und Download-Link generieren
  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  
  // Download-Link erstellen und klicken
  const a = document.createElement('a');
  a.href = url;
  a.download = `vertretungsplan-bot-logs-${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('Logs wurden zum Download bereitgestellt', 'success');
};

// Logs löschen
const clearLogs = async () => {
  if (!confirm('Möchten Sie wirklich alle Logs löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
    return;
  }
  
  try {
    const response = await fetch('/api/bot/logs', { method: 'DELETE' });
    const data = await response.json();
    if (data.success) {
      showToast('Logs wurden erfolgreich gelöscht', 'success');
      logEntries.value = [];
    } else {
      showToast('Fehler beim Löschen der Logs: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Löschen der Logs: ' + error.message, 'error');
  }
};

// Log-Level setzen
const setLogLevel = async (level) => {
  try {
    const response = await fetch('/api/bot/log-level', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level })
    });
    const data = await response.json();
    if (data.success) {
      showToast(`Log-Level wurde auf "${level}" gesetzt`, 'success');
    } else {
      showToast('Fehler beim Setzen des Log-Levels: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Setzen des Log-Levels: ' + error.message, 'error');
  }
};

// Beim Laden der Seite die Logs abrufen
onMounted(() => {
  loadLogs();
});
</script>