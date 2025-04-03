<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Bot Logs</h1>
    
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 transition-colors duration-300">
      <div class="flex items-center justify-between mb-4">
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
        <div class="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 px-4 py-2 flex justify-between items-center">
          <div class="flex space-x-4">
            <span class="text-sm font-medium dark:text-gray-200">Zeilen: {{ logEntries.length }}</span>
            <span class="text-sm font-medium dark:text-gray-200">Filter: {{ selectedLogType }}</span>
          </div>
          <button @click="downloadLogs" class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm">
            Download
          </button>
        </div>
        
        <div v-if="loading" class="flex justify-center items-center p-10 dark:bg-gray-900">
          <div class="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        
        <div v-else class="bg-black text-white p-4 max-h-[60vh] overflow-auto font-mono text-sm">
          <div v-if="logEntries.length === 0" class="text-gray-400 text-center py-4">
            Keine Logs gefunden
          </div>
          <div v-for="(entry, index) in logEntries" :key="index" class="pb-2 border-b border-gray-700 last:border-0 mb-2">
            <div :class="{
              'text-green-400': entry.level === 'info',
              'text-red-400': entry.level === 'error',
              'text-yellow-400': entry.level === 'debug',
              'text-blue-400': entry.level === 'system'
            }">
              <span class="mr-2">[{{ entry.timestamp }}]</span>
              <span class="mr-2">[{{ entry.level.toUpperCase() }}]</span>
              <span>{{ entry.message }}</span>
            </div>
            <div v-if="entry.details" class="text-gray-400 mt-1 pl-4">
              {{ entry.details }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Log-Verwaltung -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Log-Verwaltung</h2>
      <p class="text-gray-600 dark:text-gray-300 mb-4">
        Verwalten Sie Ihre Log-Dateien. Beachten Sie, dass das Löschen von Logs nicht rückgängig gemacht werden kann.
      </p>
      <div class="flex flex-wrap gap-4">
        <button @click="clearLogs" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">
          Logs löschen
        </button>
        <button @click="setLogLevel('info')" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">
          Info-Level
        </button>
        <button @click="setLogLevel('debug')" class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition">
          Debug-Level
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// Zustandsvariablen
const logEntries = ref([]);
const loading = ref(false);
const selectedLogType = ref('all');

// Logs laden
const loadLogs = async () => {
  loading.value = true;
  try {
    const response = await fetch(`/api/bot/logs?type=${selectedLogType.value}`);
    const data = await response.json();
    if (data.success) {
      logEntries.value = data.logs;
    } else {
      alert('Fehler beim Laden der Logs: ' + data.error);
      logEntries.value = [];
    }
  } catch (error) {
    console.error('Fehler beim Laden der Logs:', error);
    alert('Fehler beim Laden der Logs: ' + error.message);
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
      alert('Logs wurden erfolgreich gelöscht');
      logEntries.value = [];
    } else {
      alert('Fehler beim Löschen der Logs: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Löschen der Logs: ' + error.message);
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
      alert(`Log-Level wurde auf "${level}" gesetzt`);
    } else {
      alert('Fehler beim Setzen des Log-Levels: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Setzen des Log-Levels: ' + error.message);
  }
};

// Beim Laden der Seite die Logs abrufen
onMounted(() => {
  loadLogs();
});
</script>