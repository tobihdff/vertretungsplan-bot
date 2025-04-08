<template>
  <div>
    <h1 class="text-2xl font-bold mb-4 md:mb-6">Statistiken</h1>
    
    <div v-if="initialLoading" class="flex justify-center items-center py-10">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
    
    <div v-else>
      <!-- Status Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-500 dark:text-gray-400">Bot Status</p>
              <p class="font-semibold dark:text-white">{{ botActive ? 'Online' : 'Offline' }}</p>
            </div>
            <div :class="botActive ? 'bg-green-500' : 'bg-red-500'" class="w-3 h-3 rounded-full"></div>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Ping zum Bot</p>
            <p class="font-semibold dark:text-white">{{ botPing > -1 ? botPing + ' ms' : 'N/A' }}</p>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Ping zu Discord</p>
            <p class="font-semibold dark:text-white">{{ discordPing ? discordPing + ' ms' : 'N/A' }}</p>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Bot Laufzeit</p>
            <p class="font-semibold dark:text-white">{{ formatUptime }}</p>
          </div>
        </div>
      </div>
      
      <!-- Performance Graphs -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">Ping-Verlauf</h2>
          <div class="h-64">
            <canvas ref="pingChartRef"></canvas>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">System-Auslastung</h2>
          <div class="h-64">
            <canvas ref="systemChartRef"></canvas>
          </div>
        </div>
      </div>
      
      <!-- System Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">System-Informationen</h2>
          
          <div class="space-y-3">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Betriebssystem</span>
              <span class="font-medium dark:text-white">{{ systemInfo.platform }} ({{ systemInfo.arch }})</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Hostname</span>
              <span class="font-medium dark:text-white">{{ systemInfo.hostname }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Node.js Version</span>
              <span class="font-medium dark:text-white">{{ systemInfo.nodeVersion }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">CPU Kerne</span>
              <span class="font-medium dark:text-white">{{ systemInfo.cpu.count }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">CPU Auslastung</span>
              <span class="font-medium dark:text-white">{{ systemInfo.cpu.usagePercent.toFixed(2) }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Gesamt</span>
              <span class="font-medium dark:text-white">{{ formatBytes(systemInfo.memory.total) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Frei</span>
              <span class="font-medium dark:text-white">{{ formatBytes(systemInfo.memory.free) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Nutzung</span>
              <span class="font-medium dark:text-white">{{ systemInfo.memory.usagePercent.toFixed(2) }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">System Laufzeit</span>
              <span class="font-medium dark:text-white">{{ formatSystemUptime }}</span>
            </div>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">Bot Nutzungs-Statistiken</h2>
          
          <div class="grid grid-cols-2 gap-4 mb-6">
            <div class="bg-gray-100 dark:bg-gray-700 rounded p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Updates heute</p>
              <p class="text-2xl font-bold dark:text-white">{{ analytics.dailyUpdates }}</p>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 rounded p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Updates diese Woche</p>
              <p class="text-2xl font-bold dark:text-white">{{ analytics.weeklyUpdates }}</p>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 rounded p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Ø Änderungen pro Update</p>
              <p class="text-2xl font-bold dark:text-white">{{ analytics.averageChangesPerUpdate.toFixed(1) }}</p>
            </div>
            <div class="bg-gray-100 dark:bg-gray-700 rounded p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">Benachrichtigungen gesamt</p>
              <p class="text-2xl font-bold dark:text-white">{{ analytics.totalNotifications }}</p>
            </div>
          </div>
          
          <h3 class="text-md font-semibold mb-3 dark:text-white">Top-Aktualisierte Klassen</h3>
          <div class="space-y-2">
            <div v-for="(classItem, index) in analytics.topUpdatedClasses" :key="index" class="flex items-center">
              <div class="w-16 text-sm font-medium dark:text-white">{{ classItem.name }}</div>
              <div class="flex-grow bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mx-2">
                <div class="bg-blue-600 h-2.5 rounded-full" :style="{ width: `${(classItem.count / maxClassCount) * 100}%` }"></div>
              </div>
              <div class="w-10 text-sm text-right text-gray-600 dark:text-gray-400">{{ classItem.count }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end mt-6">
        <button @click="refreshStats" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center space-x-2">
          <span v-if="refreshing" class="inline-block w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></span>
          <span>{{ refreshing ? 'Aktualisiere...' : 'Aktualisieren' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue';
import useToast from '../composables/useToast';
import Chart from 'chart.js/auto';

const { showToast } = useToast();

// Chart references
const pingChartRef = ref(null);
const systemChartRef = ref(null);
let pingChart = null;
let systemChart = null;

// Data state
const initialLoading = ref(true);  // Nur für initiales Laden
const refreshing = ref(false);     // Für manuelle Aktualisierungen
const stats = ref({
  botActive: false,
  system: {
    cpu: { count: 0, usagePercent: 0 },
    memory: { total: 0, free: 0, used: 0, usagePercent: 0 },
    uptime: 0,
    hostname: '',
    platform: '',
    arch: '',
    nodeVersion: ''
  },
  bot: {
    ping: null,
    messageCount: null,
    commandCount: null,
    uptimeMs: null
  },
  history: {
    ping: [],
    cpu: [],
    memory: []
  },
  analytics: {
    dailyUpdates: 0,
    weeklyUpdates: 0,
    averageChangesPerUpdate: 0,
    totalNotifications: 0,
    topUpdatedClasses: []
  }
});

let refreshInterval = null;
let lastUpdateTime = 0;

// Computed properties
const botActive = computed(() => stats.value.botActive);
const systemInfo = computed(() => stats.value.system);
const botPing = computed(() => stats.value.bot?.ping || -1);
const discordPing = computed(() => stats.value.bot?.discordPing || null);
const analytics = computed(() => stats.value.analytics || {
  dailyUpdates: 0,
  weeklyUpdates: 0,
  averageChangesPerUpdate: 0,
  totalNotifications: 0,
  topUpdatedClasses: []
});

const formatUptime = computed(() => {
  const uptime = stats.value.bot?.uptimeMs;
  if (!uptime) return 'N/A';
  
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

const formatSystemUptime = computed(() => {
  const uptime = stats.value.system?.uptime;
  if (!uptime) return 'N/A';
  
  const seconds = Math.floor(uptime);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
});

const maxClassCount = computed(() => {
  if (!stats.value.analytics?.topUpdatedClasses?.length) return 1;
  return Math.max(...stats.value.analytics.topUpdatedClasses.map(c => c.count));
});

// Format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Format timestamp for charts
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Load statistics
async function loadStats(isInitial = false) {
  // Nur bei initialem Laden oder manueller Aktualisierung den Ladeindikator anzeigen
  if (isInitial) {
    initialLoading.value = true;
  } else if (!refreshInterval) {
    // Wenn es eine manuelle Aktualisierung ist (nicht durch Intervall)
    refreshing.value = true;
  }
  
  try {
    // Drosselung: Nicht öfter als alle 2 Sekunden aktualisieren
    const now = Date.now();
    if (now - lastUpdateTime < 2000 && !isInitial) {
      return;
    }
    lastUpdateTime = now;
    
    const response = await fetch('/api/system/stats');
    const data = await response.json();
    
    if (data.success) {
      // Daten aktualisieren
      stats.value = data;
      
      // Charts aktualisieren wenn sie bereits initialisiert sind
      if (pingChart && systemChart) {
        updateCharts();
      }
    } else {
      showToast('Fehler beim Laden der Statistiken: ' + data.error, 'error');
    }
  } catch (error) {
    console.error('Fehler beim Laden der Statistiken:', error);
    showToast('Fehler beim Laden der Statistiken: ' + error.message, 'error');
  } finally {
    initialLoading.value = false;
    refreshing.value = false;
  }
}

// Initialize charts
function initCharts() {
  nextTick(() => {
    // Ensure DOM is fully updated before creating charts
    if (pingChartRef.value) {
      const ctx = pingChartRef.value.getContext('2d');
      if (pingChart) pingChart.destroy(); // Destroy previous instance if exists
      
      pingChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Ping (ms)',
            data: [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            borderWidth: 3,
            tension: 0.5, // Erhöht für rundere Kurven
            fill: true,
            pointRadius: 0, // Datenpunkte ausblenden (normal)
            pointHoverRadius: 5, // Bei Hover trotzdem sichtbar
            pointHoverBackgroundColor: '#3B82F6',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                color: 'rgba(160, 160, 160, 0.1)' // Subtileres Raster
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              intersect: false,
              mode: 'index'
            }
          },
          elements: {
            line: {
              tension: 0.5, // Erhöht für rundere Kurven
              borderJoinStyle: 'round', // Abgerundete Verbindungen
              capBezierPoints: true // Bessere Kurven an den Endpunkten
            },
            point: {
              radius: 0, // Datenpunkte ausblenden
              hoverRadius: 5
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
    
    if (systemChartRef.value) {
      const ctx = systemChartRef.value.getContext('2d');
      if (systemChart) systemChart.destroy(); // Destroy previous instance if exists
      
      systemChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'CPU (%)',
              data: [],
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              borderWidth: 3,
              tension: 0.5,
              fill: true,
              pointRadius: 0, // Datenpunkte ausblenden
              pointHoverRadius: 5
            },
            {
              label: 'RAM (%)',
              data: [],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderWidth: 3,
              tension: 0.5,
              fill: true,
              pointRadius: 0, // Datenpunkte ausblenden
              pointHoverRadius: 5
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: 100,
              grid: {
                color: 'rgba(160, 160, 160, 0.1)' // Subtileres Raster
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          },
          elements: {
            line: {
              tension: 0.5, // Erhöht für rundere Kurven
              borderJoinStyle: 'round', // Abgerundete Verbindungen
              capBezierPoints: true // Bessere Kurven an den Endpunkten
            },
            point: {
              radius: 0, // Datenpunkte ausblenden
              hoverRadius: 5,
              hoverBorderWidth: 2
            }
          },
          interaction: {
            intersect: false,
            mode: 'index'
          }
        }
      });
    }
    
    // Update charts immediately if data is available
    if (stats.value.history) {
      updateCharts();
    }
  });
}

// Update chart data
function updateCharts() {
  if (!stats.value.history) return;
  
  const { ping: pingHistory, cpu: cpuHistory, memory: memoryHistory } = stats.value.history;
  
  // Update ping chart
  if (pingChart && pingHistory && pingHistory.length > 0) {
    pingChart.data.labels = pingHistory.map(p => formatTime(p.timestamp));
    pingChart.data.datasets[0].data = pingHistory.map(p => p.value);
    pingChart.update();
  }
  
  // Update system chart
  if (systemChart && cpuHistory && memoryHistory && cpuHistory.length > 0) {
    systemChart.data.labels = cpuHistory.map(c => formatTime(c.timestamp));
    systemChart.data.datasets[0].data = cpuHistory.map(c => c.value);
    systemChart.data.datasets[1].data = memoryHistory.map(m => m.value);
    systemChart.update();
  }
}

// Refresh stats manually
function refreshStats() {
  if (refreshing.value) return; // Verhindert mehrfache Klicks
  loadStats();
  showToast('Statistiken wurden aktualisiert', 'info');
}

// Lifecycle hooks
onMounted(async () => {
  // Initial loading
  await loadStats(true);
  
  nextTick(() => {
    // Initialize charts after data is loaded and DOM is updated
    initCharts();
  });
  
  // Auto refresh every 10 seconds
  refreshInterval = setInterval(() => {
    loadStats();
  }, 10000); // 10 Sekunden Intervall
});

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  
  // Clean up charts
  if (pingChart) {
    pingChart.destroy();
  }
  if (systemChart) {
    systemChart.destroy();
  }
});
</script>