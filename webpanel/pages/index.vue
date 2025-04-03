<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Vertretungsplan Bot Dashboard</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <!-- Status Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold dark:text-white">Bot Status</h2>
          <span class="px-2 py-1 text-xs rounded-full" :class="botActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'">
            {{ botActive ? 'Aktiv' : 'Inaktiv' }}
          </span>
        </div>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {{ botActive ? 'Der Bot ist aktiv und funktioniert ordnungsgemäß.' : 'Der Bot ist derzeit nicht aktiv.' }}
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400">Letzter Check: {{ lastUpdateTime }}</p>
      </div>
      
      <!-- Update Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
        <h2 class="text-lg font-semibold mb-4 dark:text-white">Letzte Aktualisierung</h2>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
          Der Vertretungsplan wurde zuletzt am {{ lastUpdateTime }} aktualisiert.
        </p>
        <button @click="forceUpdate" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition">
          Update erzwingen
        </button>
      </div>
      
      <!-- Wartungsmodus Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
        <h2 class="text-lg font-semibold mb-4 dark:text-white">Wartungsmodus</h2>
        <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
          {{ maintenanceMode ? 'Der Bot befindet sich im Wartungsmodus. Automatische Updates sind deaktiviert.' : 'Automatische Updates sind aktiviert.' }}
        </p>
        <div class="flex items-center">
          <button @click="toggleMaintenanceMode" class="w-full font-medium py-2 px-4 rounded transition"
                 :class="maintenanceMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'">
            {{ maintenanceMode ? 'Wartungsmodus deaktivieren' : 'Wartungsmodus aktivieren' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- Aktuelle Aktivitäten -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Aktuelle Aktivitäten</h2>
      <div class="space-y-3">
        <div v-for="(activity, index) in recentActivities" :key="index" class="flex items-start pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
          <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mr-3">
            <span v-if="activity.type === 'update'">🔄</span>
            <span v-else-if="activity.type === 'notification'">🔔</span>
            <span v-else>📝</span>
          </div>
          <div class="flex-1">
            <p class="font-medium dark:text-white">{{ activity.message }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ activity.timestamp }}</p>
          </div>
        </div>
        <div v-if="recentActivities.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">
          Keine Aktivitäten gefunden
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Schnellaktionen</h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button @click="clearChannel" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition">
          Channel leeren
        </button>
        <button @click="testNotification" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition">
          Benachrichtigung testen
        </button>
        <button @click="testPlanGeneration" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition">
          Plan-Generierung testen
        </button>
        <button @click="testUpdate" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition">
          Änderungserkennung testen
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

// Zustandsvariablen
const botActive = ref(true);
const maintenanceMode = ref(false);
const lastUpdateTime = ref('03.04.2025 10:15');
const recentActivities = ref([
  { type: 'update', message: 'Vertretungsplan aktualisiert', timestamp: '03.04.2025 10:15' },
  { type: 'notification', message: 'Benachrichtigung über neue Vertretungen gesendet', timestamp: '03.04.2025 10:15' },
  { type: 'status', message: 'Bot gestartet', timestamp: '03.04.2025 09:00' },
]);

// Funktionen
const forceUpdate = async () => {
  try {
    const response = await fetch('/api/bot/force-update', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      alert('Vertretungsplan-Update wurde erfolgreich durchgeführt');
      // Hier könnten wir Aktivitäten oder Status aktualisieren
    } else {
      alert('Fehler beim Aktualisieren des Vertretungsplans: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Aktualisieren des Vertretungsplans: ' + error.message);
  }
};

const toggleMaintenanceMode = async () => {
  try {
    const newState = !maintenanceMode.value;
    const response = await fetch('/api/bot/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    });
    const data = await response.json();
    if (data.success) {
      maintenanceMode.value = newState;
      alert(`Wartungsmodus wurde ${newState ? 'aktiviert' : 'deaktiviert'}`);
      // Aktivität hinzufügen
      recentActivities.value.unshift({
        type: 'status',
        message: `Wartungsmodus ${newState ? 'aktiviert' : 'deaktiviert'}`,
        timestamp: new Date().toLocaleDateString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      });
    } else {
      alert('Fehler beim Ändern des Wartungsmodus: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Ändern des Wartungsmodus: ' + error.message);
  }
};

const clearChannel = async () => {
  try {
    const response = await fetch('/api/bot/clear-channel', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      alert('Der Channel wurde erfolgreich geleert');
    } else {
      alert('Fehler beim Leeren des Channels: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Leeren des Channels: ' + error.message);
  }
};

const testNotification = async () => {
  try {
    const response = await fetch('/api/bot/test-notification', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      alert('Benachrichtigung wurde erfolgreich getestet');
    } else {
      alert('Fehler beim Testen der Benachrichtigung: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Testen der Benachrichtigung: ' + error.message);
  }
};

const testPlanGeneration = async () => {
  try {
    const response = await fetch('/api/bot/test-plan', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      alert('Plan-Generierung wurde erfolgreich getestet');
    } else {
      alert('Fehler beim Testen der Plan-Generierung: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Testen der Plan-Generierung: ' + error.message);
  }
};

const testUpdate = async () => {
  try {
    const response = await fetch('/api/bot/test-update', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      alert('Änderungserkennung wurde erfolgreich getestet');
    } else {
      alert('Fehler beim Testen der Änderungserkennung: ' + data.error);
    }
  } catch (error) {
    alert('Fehler beim Testen der Änderungserkennung: ' + error.message);
  }
};

// Daten beim Laden der Seite abrufen
onMounted(async () => {
  try {
    const response = await fetch('/api/bot/status');
    const data = await response.json();
    if (data.success) {
      botActive.value = data.active;
      maintenanceMode.value = data.maintenanceMode;
      lastUpdateTime.value = data.lastUpdate;
      if (data.recentActivities) {
        recentActivities.value = data.recentActivities;
      }
    }
  } catch (error) {
    console.error('Fehler beim Laden des Bot-Status:', error);
  }
});
</script>