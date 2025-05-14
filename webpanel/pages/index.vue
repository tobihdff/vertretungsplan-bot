<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 md:mb-6">Dashboard</h1>
    
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-8">
      <!-- Status Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300 flex flex-col h-full">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg font-semibold dark:text-white">Bot Status</h2>
          <span class="px-2 py-1 text-xs rounded-full" :class="botActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'">
            {{ botActive ? 'Aktiv' : 'Inaktiv' }}
          </span>
        </div>
        <div class="flex-grow">
          <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">
            {{ statusMessage }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">Letzter Check: {{ lastUpdateTime }}</p>
        </div>
        <button @click="refreshStatus" class="mt-4 w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-4 rounded transition">
          Status aktualisieren
        </button>
      </div>
      
      <!-- Update Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300 flex flex-col h-full">
        <h2 class="text-lg font-semibold mb-4 dark:text-white">Letzte Aktualisierung</h2>
        <div class="flex-grow">
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            Der Vertretungsplan wurde zuletzt am {{ lastUpdateTime }} aktualisiert.
          </p>
        </div>
        <button @click="showForceUpdateConfirm" class="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition" :disabled="!botActive">
          Update erzwingen
        </button>
      </div>
      
      <!-- Wartungsmodus Card -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300 flex flex-col h-full">
        <h2 class="text-lg font-semibold mb-4 dark:text-white">Wartungsmodus</h2>
        <div class="flex-grow">
          <p class="text-gray-600 dark:text-gray-300 text-sm">
            {{ maintenanceMode ? 'Der Bot befindet sich im Wartungsmodus. Automatische Updates sind deaktiviert.' : 'Automatische Updates sind aktiviert.' }}
          </p>
        </div>
        <button @click="showMaintenanceModeConfirm" 
               class="mt-4 w-full font-medium py-2 px-4 rounded transition"
               :class="maintenanceMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white'"
               :disabled="!botActive">
          {{ maintenanceMode ? 'Wartungsmodus deaktivieren' : 'Wartungsmodus aktivieren' }}
        </button>
      </div>
    </div>
    
    <!-- Aktuelle Aktivitäten -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 mb-4 md:mb-8 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Aktuelle Aktivitäten</h2>
      <div class="space-y-3">
        <div v-for="(activity, index) in recentActivities" :key="index" class="flex items-start pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0">
          <div class="w-8 h-8 rounded-full flex items-center justify-center mr-3"
               :class="{
                 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400': activity.type === 'update',
                 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400': activity.type === 'notification',
                 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400': activity.type === 'error',
                 'bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400': activity.type === 'status'
               }">
            <span v-if="activity.type === 'update'">🔄</span>
            <span v-else-if="activity.type === 'notification'">🔔</span>
            <span v-else-if="activity.type === 'error'">❗</span>
            <span v-else>📝</span>
          </div>
          <div class="flex-1">
            <p class="font-medium dark:text-white break-words">{{ activity.message }}</p>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ activity.timestamp }}</p>
          </div>
        </div>
        <div v-if="recentActivities.length === 0" class="text-gray-500 dark:text-gray-400 text-center py-4">
          Keine Aktivitäten gefunden
        </div>
      </div>
    </div>
    
    <!-- Quick Actions -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
      <h2 class="text-lg font-semibold mb-4 dark:text-white">Schnellaktionen</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <button @click="showChannelIdModal" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 md:px-4 text-sm md:text-base rounded transition" :disabled="!botActive">
          Channel leeren
        </button>
        <button @click="showTestNotificationConfirm" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 md:px-4 text-sm md:text-base rounded transition" :disabled="!botActive">
          Benachrichtigung testen
        </button>
        <button @click="showTestPlanGenerationConfirm" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 md:px-4 text-sm md:text-base rounded transition" :disabled="!botActive">
          Plan-Generierung testen
        </button>
        <button @click="showTestUpdateConfirm" class="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium py-2 px-3 md:px-4 text-sm md:text-base rounded transition" :disabled="!botActive">
          Änderungserkennung testen
        </button>
      </div>
    </div>

    <!-- Channel-ID Input Modal -->
    <InputModal
      :is-open="isChannelIdModalOpen"
      title="Channel leeren"
      label="Bitte geben Sie die Channel-ID ein:"
      placeholder="123456789012345678"
      help-text="Dies wird alle Nachrichten im angegebenen Channel löschen."
      @confirm="onChannelIdConfirm"
      @cancel="isChannelIdModalOpen = false"
    />

    <!-- Bestätigungs-Modals -->
    <ConfirmationModal
      :is-open="isNotificationConfirmOpen"
      title="Test-Benachrichtigung senden"
      message="Möchten Sie eine Test-Benachrichtigung an alle konfigurierten Kanäle senden?"
      details="Dies wird eine Test-Benachrichtigung an alle Nutzer senden, die den Bot abonniert haben."
      type="primary"
      @confirm="onConfirmTestNotification"
      @cancel="isNotificationConfirmOpen = false"
    />

    <ConfirmationModal
      :is-open="isPlanGenerationConfirmOpen"
      title="Plan-Generierung testen"
      message="Möchten Sie die Plan-Generierung testen?"
      details="Es wird ein neuer Vertretungsplan generiert, aber keine Benachrichtigungen verschickt."
      type="primary"
      @confirm="onConfirmTestPlanGeneration"
      @cancel="isPlanGenerationConfirmOpen = false"
    />

    <ConfirmationModal
      :is-open="isUpdateConfirmOpen"
      title="Änderungserkennung testen"
      message="Möchten Sie die Änderungserkennung testen?"
      details="Dies wird überprüfen, ob sich der Vertretungsplan geändert hat."
      type="primary"
      @confirm="onConfirmTestUpdate"
      @cancel="isUpdateConfirmOpen = false"
    />

    <ConfirmationModal
      :is-open="isForceUpdateConfirmOpen"
      title="Update erzwingen"
      message="Möchten Sie ein Update des Vertretungsplans erzwingen?"
      details="Dies wird die Vertretungsplan-Daten neu laden, auch wenn sie sich nicht geändert haben."
      type="primary"
      @confirm="onConfirmForceUpdate"
      @cancel="isForceUpdateConfirmOpen = false"
    />

    <ConfirmationModal
      :is-open="isMaintenanceConfirmOpen"
      :title="maintenanceMode ? 'Wartungsmodus deaktivieren' : 'Wartungsmodus aktivieren'"
      :message="maintenanceMode ? 'Möchten Sie den Wartungsmodus deaktivieren?' : 'Möchten Sie den Wartungsmodus aktivieren?'"
      :details="maintenanceMode 
        ? 'Automatische Updates werden wieder aktiviert.' 
        : 'Im Wartungsmodus werden automatische Updates deaktiviert.'"
      :type="maintenanceMode ? 'primary' : 'warning'"
      @confirm="onConfirmMaintenanceToggle"
      @cancel="isMaintenanceConfirmOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue';
import useToast from '../composables/useToast';
import InputModal from '../components/InputModal.vue';
import ConfirmationModal from '../components/ConfirmationModal.vue';

// Zustandsvariablen
const botActive = ref(false);
const maintenanceMode = ref(false);
const lastUpdateTime = ref('Unbekannt');
const recentActivities = ref([]);
const refreshInterval = ref(null);
const isLoading = ref(true);
const { showToast } = useToast();

// Modal States
const isChannelIdModalOpen = ref(false);
const isNotificationConfirmOpen = ref(false);
const isPlanGenerationConfirmOpen = ref(false);
const isUpdateConfirmOpen = ref(false);
const isForceUpdateConfirmOpen = ref(false);
const isMaintenanceConfirmOpen = ref(false);

// Berechnete Eigenschaft für Statusmeldung
const statusMessage = computed(() => {
  if (isLoading.value) {
    return 'Status wird geladen...';
  } else if (botActive.value) {
    return maintenanceMode.value 
      ? 'Der Bot ist aktiv, befindet sich aber im Wartungsmodus.' 
      : 'Der Bot ist aktiv und funktioniert ordnungsgemäß.';
  } else {
    return 'Der Bot ist derzeit nicht aktiv oder nicht erreichbar.';
  }
});

// Funktion zum Abrufen des Bot-Status
const fetchBotStatus = async () => {
  try {
    const response = await fetch('/api/bot/status');
    const data = await response.json();
    if (data.success) {
      botActive.value = data.active;
      maintenanceMode.value = data.maintenanceMode;
      lastUpdateTime.value = data.lastUpdate;
      if (data.recentActivities && data.recentActivities.length > 0) {
        recentActivities.value = data.recentActivities;
      }
    } else {
      // Status konnte nicht abgerufen werden
      botActive.value = false;
    }
    isLoading.value = false;
  } catch (error) {
    console.error('Fehler beim Laden des Bot-Status:', error);
    botActive.value = false;
    isLoading.value = false;
  }
};

// Manuelles Aktualisieren des Status
const refreshStatus = async () => {
  isLoading.value = true;
  await fetchBotStatus();
};

// Force Update Modal anzeigen
const showForceUpdateConfirm = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Update kann nicht durchgeführt werden.', 'error');
    return;
  }
  isForceUpdateConfirmOpen.value = true;
};

// Force Update nach Bestätigung
const onConfirmForceUpdate = async () => {
  try {
    const response = await fetch('/api/bot/force-update', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      showToast('Vertretungsplan-Update wurde erfolgreich durchgeführt', 'success');
      // Status nach Update aktualisieren
      await fetchBotStatus();
    } else {
      showToast('Fehler beim Aktualisieren des Vertretungsplans: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Aktualisieren des Vertretungsplans: ' + error.message, 'error');
  } finally {
    isForceUpdateConfirmOpen.value = false;
  }
};

// Wartungsmodus Modal anzeigen
const showMaintenanceModeConfirm = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Wartungsmodus kann nicht geändert werden.', 'warning');
    return;
  }
  isMaintenanceConfirmOpen.value = true;
};

// Wartungsmodus umschalten nach Bestätigung
const onConfirmMaintenanceToggle = async () => {
  try {
    const newState = !maintenanceMode.value;
    const response = await fetch('/api/bot/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: newState })
    });
    const data = await response.json();
    if (data.success) {
      await fetchBotStatus(); // Aktualisieren des Status nach Änderung
      showToast(`Wartungsmodus wurde ${newState ? 'aktiviert' : 'deaktiviert'}`, newState ? 'warning' : 'success');
    } else {
      showToast('Fehler beim Ändern des Wartungsmodus: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Ändern des Wartungsmodus: ' + error.message, 'error');
  } finally {
    isMaintenanceConfirmOpen.value = false;
  }
};

// Modal für Channel-ID anzeigen
const showChannelIdModal = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Channel kann nicht geleert werden.', 'error');
    return;
  }
  isChannelIdModalOpen.value = true;
};

// Verarbeitung der Channel-ID und Ausführung des Channel-Löschens
const onChannelIdConfirm = async (channelId) => {
  if (!channelId) {
    isChannelIdModalOpen.value = false;
    return;
  }
  
  try {
    const response = await fetch('/api/bot/clear-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId })
    });
    const data = await response.json();
    if (data.success) {
      showToast('Der Channel wurde erfolgreich geleert', 'success');
      await fetchBotStatus(); // Status aktualisieren
    } else {
      showToast('Fehler beim Leeren des Channels: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Leeren des Channels: ' + error.message, 'error');
  } finally {
    isChannelIdModalOpen.value = false;
  }
};

// Benachrichtigung testen - Modal anzeigen
const showTestNotificationConfirm = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Benachrichtigung kann nicht getestet werden.', 'error');
    return;
  }
  isNotificationConfirmOpen.value = true;
};

// Benachrichtigung testen - nach Bestätigung
const onConfirmTestNotification = async () => {
  try {
    const response = await fetch('/api/bot/test-notification', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      showToast('Benachrichtigung wurde erfolgreich getestet', 'success');
      await fetchBotStatus(); // Status aktualisieren
    } else {
      showToast('Fehler beim Testen der Benachrichtigung: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Testen der Benachrichtigung: ' + error.message, 'error');
  } finally {
    isNotificationConfirmOpen.value = false;
  }
};

// Plan-Generierung testen - Modal anzeigen
const showTestPlanGenerationConfirm = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Plan-Generierung kann nicht getestet werden.', 'error');
    return;
  }
  isPlanGenerationConfirmOpen.value = true;
};

// Plan-Generierung testen - nach Bestätigung
const onConfirmTestPlanGeneration = async () => {
  try {
    const response = await fetch('/api/bot/test-plan', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      showToast('Plan-Generierung wurde erfolgreich getestet', 'success');
      await fetchBotStatus(); // Status aktualisieren
    } else {
      showToast('Fehler beim Testen der Plan-Generierung: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Testen der Plan-Generierung: ' + error.message, 'error');
  } finally {
    isPlanGenerationConfirmOpen.value = false;
  }
};

// Änderungserkennung testen - Modal anzeigen
const showTestUpdateConfirm = () => {
  if (!botActive.value) {
    showToast('Der Bot ist nicht erreichbar. Änderungserkennung kann nicht getestet werden.', 'error');
    return;
  }
  isUpdateConfirmOpen.value = true;
};

// Änderungserkennung testen - nach Bestätigung
const onConfirmTestUpdate = async () => {
  try {
    const response = await fetch('/api/bot/test-update', { method: 'POST' });
    const data = await response.json();
    if (data.success) {
      showToast('Änderungserkennung wurde erfolgreich getestet', 'success');
      await fetchBotStatus(); // Status aktualisieren
    } else {
      showToast('Fehler beim Testen der Änderungserkennung: ' + data.error, 'error');
    }
  } catch (error) {
    showToast('Fehler beim Testen der Änderungserkennung: ' + error.message, 'error');
  } finally {
    isUpdateConfirmOpen.value = false;
  }
};

// Seite initialisieren
onMounted(async () => {
  // Status beim ersten Laden abrufen
  await fetchBotStatus();
  
  // Periodischen Status-Refresh starten (alle 30 Sekunden)
  refreshInterval.value = setInterval(fetchBotStatus, 30000);
});

// Cleanup wenn Komponente zerstört wird
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value);
  }
});

definePageMeta({
  middleware: ['auth']
})
</script>

<style scoped>
button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>