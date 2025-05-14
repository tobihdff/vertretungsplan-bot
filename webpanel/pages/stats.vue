<template>
  <div class="container mx-auto">
    <h1 class="text-2xl md:text-3xl font-bold mb-6 dark:text-white">Systemstatistiken</h1>
    
    <div v-if="initialLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else>
      <!-- Quick Stats Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Bot Status</p>
            <div class="flex items-center">
              <span :class="botActive ? 'bg-green-500' : 'bg-red-500'" class="inline-block w-2 h-2 rounded-full mr-2"></span>
              <p class="font-semibold dark:text-white">{{ botActive ? 'Online' : 'Offline' }}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">System Auslastung</p>
            <p class="font-semibold dark:text-white">
              CPU: {{ systemInfo?.cpu?.usagePercent?.toFixed(1) || '0.0' }}% | 
              RAM: {{ systemInfo?.memory?.usagePercent?.toFixed(1) || '0.0' }}%
            </p>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Ping</p>
            <p class="font-semibold dark:text-white">
              API: {{ botPing >= 0 ? `${botPing}ms` : 'N/A' }} | 
              Discord: {{ discordPing ? `${discordPing}ms` : 'N/A' }}
            </p>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-5 transition-colors duration-300">
          <div>
            <p class="text-sm text-gray-500 dark:text-gray-400">Bot Laufzeit</p>
            <p class="font-semibold dark:text-white">{{ formatUptime }}</p>
          </div>
        </div>
      </div>
      
      <!-- Lazy-loaded Performance Graphs -->
      <ClientOnly>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
            <h2 class="text-lg font-semibold mb-4 dark:text-white">Ping-Verlauf</h2>
            <div class="h-64">
              <canvas ref="pingChartRef"></canvas>
            </div>
          </div>
          
          <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
            <h2 class="text-lg font-semibold mb-4 dark:text-white">System-Verlauf</h2>
            <div class="h-64">
              <canvas ref="systemChartRef"></canvas>
            </div>
          </div>
        </div>
      </ClientOnly>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <!-- System Information -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">Systeminformationen</h2>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">CPU Kerne</span>
              <span class="font-medium dark:text-white">{{ systemInfo?.cpu?.count || 'N/A' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">CPU Auslastung</span>
              <span class="font-medium dark:text-white">{{ systemInfo?.cpu?.usagePercent?.toFixed(1) || '0.0' }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Gesamt</span>
              <span class="font-medium dark:text-white">{{ formatBytes(systemInfo?.memory?.total) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Frei</span>
              <span class="font-medium dark:text-white">{{ formatBytes(systemInfo?.memory?.free) }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">RAM Nutzung</span>
              <span class="font-medium dark:text-white">{{ systemInfo?.memory?.usagePercent?.toFixed(1) || '0.0' }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">System Laufzeit</span>
              <span class="font-medium dark:text-white">{{ formatSystemUptime }}</span>
            </div>
          </div>
        </div>
        
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6 transition-colors duration-300">
          <h2 class="text-lg font-semibold mb-4 dark:text-white">Bot Nutzungs-Statistiken</h2>
          <div class="space-y-2">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Updates heute</span>
              <span class="font-medium dark:text-white">{{ analytics?.dailyUpdates || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Updates diese Woche</span>
              <span class="font-medium dark:text-white">{{ analytics?.weeklyUpdates || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Durchschn. Änderungen</span>
              <span class="font-medium dark:text-white">{{ analytics?.averageChangesPerUpdate?.toFixed(1) || '0.0' }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Benachrichtigungen</span>
              <span class="font-medium dark:text-white">{{ analytics?.totalNotifications || 0 }}</span>
            </div>
            
            <div class="pt-2" v-if="analytics?.topUpdatedClasses?.length">
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Häufigste Änderungen nach Klasse</p>
              <div v-for="classItem in analytics.topUpdatedClasses" :key="classItem.name" class="flex items-center mb-1.5">
                <span class="text-sm dark:text-white w-8">{{ classItem.name }}</span>
                <div class="flex-1 mx-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div class="bg-blue-600 h-2.5 rounded-full" :style="`width: ${(classItem.count / (maxClassCount || 1)) * 100}%`"></div>
                </div>
                <div class="w-10 text-sm text-right text-gray-600 dark:text-gray-400">{{ classItem.count }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="flex justify-between mt-6">
        <div class="text-sm text-gray-500 dark:text-gray-400">
          <span v-if="lastUpdateTime">Letzte Aktualisierung: {{ formatLastUpdateTime }}</span>
          <span v-else>&nbsp;</span>
        </div>
        <button 
          @click="refreshStats" 
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition flex items-center space-x-2" 
          :disabled="refreshing"
          :class="{'opacity-70 cursor-not-allowed': refreshing}"
        >
          <span v-if="refreshing" class="inline-block w-4 h-4 border-2 border-white border-b-transparent rounded-full animate-spin"></span>
          <span>{{ refreshing ? 'Aktualisiere...' : 'Aktualisieren' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, nextTick, shallowRef, onActivated, onDeactivated } from 'vue'
import useToast from '../composables/useToast'

definePageMeta({
  middleware: ['auth']
})

// Replace process.client with import.meta.client
const isClient = import.meta.client

// Chart.js korrekt importieren und erst auf dem Client initialisieren
let Chart;
// Dynamischer Import für bessere Client-Side-Kompatibilität
const importChartJS = async () => {
  if (isClient) {
    Chart = (await import('chart.js/auto')).default;
  }
};

const { showToast } = useToast();

// Chart-Referenzen
const pingChartRef = ref(null);
const systemChartRef = ref(null);

// Chart-Instanzen mit langlebigen Objekten definieren
let pingChart = null;
let systemChart = null;

// Performance-optimierter Zustand mit shallowRef für komplexe Objekte
const initialLoading = ref(true);
const refreshing = ref(false);
const lastUpdateTime = ref(0);
const pageActive = ref(true); // Tracking Seitenaktivität für optimiertes Rendering

// Verwende shallowRef für komplexe verschachtelte Objekte
const stats = shallowRef({
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

// Refresh-Intervall mit optimierter Frequenz und Ressourcennutzung
let refreshInterval = null;
const REFRESH_INTERVAL = 15000; // Von 10s auf 15s erhöht für weniger Serverbelastung
const MIN_REFRESH_TIME = 5000;  // Drosselung manueller Aktualisierungen

// Verwendung von AbortController für abbrechbare Fetch-Anfragen
let currentAbortController = null;

// Performance-Optimierung: Computed-Properties für abgeleitete Daten
const botActive = computed(() => stats.value.botActive);
const systemInfo = computed(() => stats.value.system);
const botPing = computed(() => stats.value.bot?.ping ?? -1);
const discordPing = computed(() => stats.value.bot?.discordPing ?? null);
const analytics = computed(() => stats.value.analytics || {});

// Formatierung der letzten Aktualisierungszeit
const formatLastUpdateTime = computed(() => {
  if (!lastUpdateTime.value) return '';
  return new Date(lastUpdateTime.value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
});

// Optimierung: Memoized Computed für formatierte Uptime (seltene Änderungen)
const formatUptime = computed(() => {
  const uptime = stats.value.bot?.uptimeMs;
  if (!uptime) return 'N/A';
  
  // Berechnung mit Cache
  const cachingKey = Math.floor(uptime / 60000); // Caching auf Minutenbasis
  if (formatUptimeCache.has(cachingKey)) {
    return formatUptimeCache.get(cachingKey);
  }
  
  const seconds = Math.floor(uptime / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  let result;
  if (days > 0) {
    result = `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    result = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else {
    result = `${minutes}m ${seconds % 60}s`;
  }
  
  // Cache-Ergebnis (begrenzte Größe)
  formatUptimeCache.set(cachingKey, result);
  if (formatUptimeCache.size > 100) formatUptimeCache.delete(formatUptimeCache.keys().next().value);
  
  return result;
});

// Optimierte System-Uptime-Formatierung mit Cache
const formatSystemUptime = computed(() => {
  const uptime = systemInfo.value?.uptime;
  if (!uptime) return 'N/A';
  
  // Cache-Lookup
  const cacheKey = Math.floor(uptime / 60); // Minuten-basierter Cache
  if (formatSystemUptimeCache.has(cacheKey)) {
    return formatSystemUptimeCache.get(cacheKey);
  }
  
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  let result;
  if (days > 0) {
    result = `${days}d ${hours}h ${minutes}m`;
  } else {
    result = `${hours}h ${minutes}m`;
  }
  
  // Cache-Ergebnis
  formatSystemUptimeCache.set(cacheKey, result);
  if (formatSystemUptimeCache.size > 100) formatSystemUptimeCache.delete(formatSystemUptimeCache.keys().next().value);
  
  return result;
});

const maxClassCount = computed(() => {
  if (!stats.value.analytics?.topUpdatedClasses?.length) return 1;
  return Math.max(...stats.value.analytics.topUpdatedClasses.map(c => c.count));
});

// Caches für Memoization wiederverwendbarer Werte
const bytesCache = new Map();
const timeCache = new Map();
const formatUptimeCache = new Map();
const formatSystemUptimeCache = new Map();

// Format bytes mit effizienterem Memoization-Cache
function formatBytes(bytes, decimals = 1) {
  if (bytes === 0 || bytes === undefined || bytes === null) return '0 Bytes';
  
  // Cache-Lookups für häufig verwendete Werte
  const cacheKey = `${bytes}_${decimals}`;
  if (bytesCache.has(cacheKey)) {
    return bytesCache.get(cacheKey);
  }
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const result = parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  
  // Cache-Speicherung mit Begrenzung
  bytesCache.set(cacheKey, result);
  if (bytesCache.size > 50) { // Reduzierte Cache-Größe
    bytesCache.delete(bytesCache.keys().next().value);
  }
  
  return result;
}

// Optimierte Zeit-Formatierung mit Cache
function formatTime(timestamp) {
  // Nur ganzzahlige Minuten für bessere Cache-Ausnutzung
  const roundedTimestamp = Math.floor(timestamp / 60000) * 60000;
  
  // Cache-Lookup
  if (timeCache.has(roundedTimestamp)) {
    return timeCache.get(roundedTimestamp);
  }
  
  const date = new Date(timestamp);
  const result = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  // Cache-Speicherung mit Begrenzung
  timeCache.set(roundedTimestamp, result);
  if (timeCache.size > 50) {
    timeCache.delete(timeCache.keys().next().value);
  }
  
  return result;
}

// Performance-optimiertes Laden der Stats mit AbortController für abbrechbare Requests
async function loadStats(isInitial = false, isManual = false) {
  // Abbrechen laufender Anfragen
  if (currentAbortController) {
    currentAbortController.abort();
  }
  
  // Ladeindikator nur zeigen wenn nötig
  if (isInitial) {
    initialLoading.value = true;
  } else if (isManual) {
    refreshing.value = true;
  }
  
  try {
    // Drosselung: Nicht öfter als alle MIN_REFRESH_TIME Sekunden aktualisieren
    const now = Date.now();
    if (!isInitial && !isManual && now - lastUpdateTime.value < MIN_REFRESH_TIME) {
      return;
    }
    
    // Neue Anfrage mit AbortController
    currentAbortController = new AbortController();
    const { signal } = currentAbortController;
    
    // Effizienter Fetch mit Cache-Kontrolle und Signal
    const response = await fetch('/api/system/stats', {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // ETag-Support für effizientere Server-Kommunikation
    const etag = response.headers.get('etag');
    if (etag) {
      localStorage.setItem('stats_etag', etag);
    }
    
    const data = await response.json();
    
    if (data.success) {
      // Effizientes Update des Zustands
      stats.value = data;
      lastUpdateTime.value = Date.now();
      
      // Charts aktualisieren, aber nur wenn sichtbar
      if ((pingChart || systemChart) && pageActive.value) {
        // Verzögerte Aktualisierung für bessere Leistung
        window.requestAnimationFrame(() => {
          updateCharts();
        });
      }
    } else if (isManual) {
      showToast('Fehler beim Laden der Statistiken: ' + (data.error || 'Unbekannter Fehler'), 'error');
    }
  } catch (error) {
    // Fehler ignorieren, wenn abgebrochen
    if (error.name === 'AbortError') return;
    
    console.error('Fehler beim Laden der Statistiken:', error);
    if (isManual) {
      showToast('Fehler beim Laden der Statistiken: ' + error.message, 'error');
    }
  } finally {
    currentAbortController = null;
    initialLoading.value = false;
    refreshing.value = false;
  }
}

// Performance-optimierte Chart-Initialisierung mit verzögertem Laden
function initCharts() {
  // Verzögerte Chart-Erstellung für bessere Erstladezeit
  nextTick(() => {
    // Abbrechen, wenn die Seite nicht mehr aktiv ist
    if (!pageActive.value) return;
    
    // Chart.js-Konfiguration für bessere Performance
    Chart.defaults.font.family = "'Inter', 'Helvetica', 'Arial', sans-serif";
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    
    // Ping-Chart-Optimierungen
    if (pingChartRef.value) {
      const ctx = pingChartRef.value.getContext('2d');
      if (pingChart) pingChart.destroy(); // Vermeidung von Memory-Leaks
      
      pingChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Ping (ms)',
            data: [],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            borderWidth: 2,
            tension: 0.2, // Reduzierte Kurvenglättung für bessere Performance
            fill: true,
            pointRadius: 0, // Keine Punkte für bessere Performance
            pointHoverRadius: 4
          }]
        },
        options: {
          animation: {
            duration: shouldReduceMotion() ? 0 : 300 // Reduzierte Animation
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
              position: 'nearest'
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxTicksLimit: 6,
                maxRotation: 0
              },
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              ticks: {
                maxTicksLimit: 5
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              }
            }
          },
          elements: {
            line: {
              borderWidth: 2
            }
          },
          layout: {
            padding: 5
          },
          devicePixelRatio: 1.5 // Optimierte Auflösung für Performance/Qualität-Balance
        }
      });
    }
    
    // System-Chart optimiert
    if (systemChartRef.value) {
      const ctx = systemChartRef.value.getContext('2d');
      if (systemChart) systemChart.destroy();
      
      systemChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [
            {
              label: 'CPU (%)',
              data: [],
              borderColor: '#EF4444',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4
            },
            {
              label: 'RAM (%)',
              data: [],
              borderColor: '#10B981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 2,
              tension: 0.2,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4
            }
          ]
        },
        options: {
          animation: {
            duration: shouldReduceMotion() ? 0 : 300
          },
          interaction: {
            intersect: false,
            mode: 'index'
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                boxWidth: 12,
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              mode: 'index',
              intersect: false,
              position: 'nearest'
            }
          },
          scales: {
            x: {
              display: true,
              ticks: {
                maxTicksLimit: 6,
                maxRotation: 0
              },
              grid: {
                display: false
              }
            },
            y: {
              display: true,
              beginAtZero: true,
              ticks: {
                maxTicksLimit: 5,
                callback: function(value) {
                  return value + '%';
                }
              },
              grid: {
                color: 'rgba(0, 0, 0, 0.05)'
              },
              suggestedMax: 100
            }
          },
          elements: {
            line: {
              borderWidth: 2
            }
          },
          layout: {
            padding: 5
          },
          devicePixelRatio: 1.5
        }
      });
    }
    
    // Update charts sofort mit vorhandenen Daten wenn verfügbar
    if (stats.value.history) {
      updateCharts();
    }
  });
}

// Prüfen auf reduzierte Bewegung mit Cache
const reducedMotionState = ref(null);

function shouldReduceMotion() {
  // Cache für wiederholte Aufrufe
  if (reducedMotionState.value !== null) return reducedMotionState.value;
  
  // Server-side rendering check
  if (typeof window === 'undefined') return false;
  
  // Präferenz ermitteln und cachen
  reducedMotionState.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reducedMotionState.value;
}

// Optimiertes Chart-Update mit minimalen Neuberechnungen
function updateCharts() {
  if (!pageActive.value || !stats.value.history) return;
  
  const { ping: pingHistory, cpu: cpuHistory, memory: memoryHistory } = stats.value.history;
  
  // Ping-Chart optimiert aktualisieren
  if (pingChart && pingHistory?.length > 0) {
    const isPingChanged = !pingChart.data.labels.length || 
                          pingHistory.length !== pingChart.data.labels.length ||
                          pingHistory[pingHistory.length-1].timestamp !== 
                          parseInt(pingChart.data.labels[pingChart.data.labels.length-1]);
                          
    // Nur aktualisieren, wenn sich Daten geändert haben
    if (isPingChanged) {
      pingChart.data.labels = pingHistory.map(p => formatTime(p.timestamp));
      pingChart.data.datasets[0].data = pingHistory.map(p => p.value);
      pingChart.update('quiet'); // Minimaler Update-Modus
    }
  }
  
  // System-Chart optimiert aktualisieren
  if (systemChart && cpuHistory?.length > 0 && memoryHistory?.length > 0) {
    const isSystemChanged = !systemChart.data.labels.length || 
                            cpuHistory.length !== systemChart.data.labels.length ||
                            cpuHistory[cpuHistory.length-1].timestamp !== 
                            parseInt(systemChart.data.labels[systemChart.data.labels.length-1]);
                            
    // Nur aktualisieren, wenn sich Daten geändert haben
    if (isSystemChanged) {
      systemChart.data.labels = cpuHistory.map(c => formatTime(c.timestamp));
      systemChart.data.datasets[0].data = cpuHistory.map(c => c.value);
      systemChart.data.datasets[1].data = memoryHistory.map(m => m.value);
      systemChart.update('quiet');
    }
  }
}

// Optimierte Refresh-Funktion mit Debouncing
const refreshStats = (() => {
  let timeout = null;
  
  return () => {
    if (refreshing.value) return; // Verhindert mehrfache Klicks
    
    // Bestehenden Timeout abbrechen
    if (timeout) {
      clearTimeout(timeout);
    }
    
    // Sofort mit manueller Flag ausführen
    loadStats(false, true).then(() => {
      showToast('Statistiken wurden aktualisiert', 'success', 3000);
    });
    
    // Nächsten automatischen Refresh verzögern
    timeout = setTimeout(() => {
      timeout = null;
    }, REFRESH_INTERVAL);
  };
})();

// Optimierte Lifecycle-Hooks mit Ressourcenfreigabe
onMounted(async () => {
  // Chart.js erst auf dem Client importieren
  await importChartJS();
  
  // Seite als aktiv markieren
  pageActive.value = true;
  
  // Initiales Laden
  await loadStats(true);
  
  // Charts initialisieren mit Verzögerung für bessere Erstladezeit
  setTimeout(() => {
    if (pageActive.value && Chart) {
      initCharts();
    }
  }, 200);
  
  // Optimiertes Intervall mit Überprüfung der Seitenaktivität
  refreshInterval = setInterval(() => {
    if (pageActive.value && !refreshing.value && document.visibilityState === 'visible') {
      loadStats();
    }
  }, REFRESH_INTERVAL);
  
  // Event-Listener für Seitenvisibilität
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Automatische Aktualisierung beim Wiederherstellen der Verbindung
  window.addEventListener('online', handleOnlineStatus);
});

// Verbesserte Sichtbarkeits- und Online-Status-Behandlung
function handleVisibilityChange() {
  const isVisible = document.visibilityState === 'visible';
  
  // Daten aktualisieren, wenn die Seite wieder sichtbar wird
  if (isVisible && pageActive.value) {
    loadStats();
  }
}

function handleOnlineStatus() {
  if (navigator.onLine && pageActive.value) {
    // Kurze Verzögerung für Netzwerkstabilisierung
    setTimeout(() => {
      loadStats();
      showToast('Verbindung wiederhergestellt, Daten werden aktualisiert', 'info');
    }, 1500);
  }
}

// Komponenten-Aktivierung und -Deaktivierung für Keep-Alive-Support
onActivated(() => {
  pageActive.value = true;
  lastUpdateTime.value = 0; // Sofortiges Update erzwingen
  loadStats();
  
  // Intervall neu starten wenn nötig
  if (!refreshInterval) {
    refreshInterval = setInterval(() => {
      if (pageActive.value && !refreshing.value && document.visibilityState === 'visible') {
        loadStats();
      }
    }, REFRESH_INTERVAL);
  }
});

onDeactivated(() => {
  pageActive.value = false;
  
  // Intervall stoppen um Ressourcen zu sparen
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
});

onUnmounted(() => {
  // Alle Ressourcen ordnungsgemäß freigeben
  pageActive.value = false;
  
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('online', handleOnlineStatus);
  
  // Laufende Anfrage abbrechen
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
  
  // Chart-Ressourcen freigeben
  if (pingChart) {
    pingChart.destroy();
    pingChart = null;
  }
  
  if (systemChart) {
    systemChart.destroy();
    systemChart = null;
  }
  
  // Caches leeren
  bytesCache.clear();
  timeCache.clear();
  formatUptimeCache.clear();
  formatSystemUptimeCache.clear();
});
</script>