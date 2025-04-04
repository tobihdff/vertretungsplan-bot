<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <div class="flex">
      <!-- Sidebar -->
      <aside class="w-64 bg-blue-900 dark:bg-blue-950 min-h-screen p-4">
        <div class="text-white font-bold text-xl mb-8 flex items-center">
          <span class="mr-2">📊</span> Vertretungsplan
        </div>
        <nav class="space-y-2">
          <NuxtLink to="/" class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition">Dashboard</NuxtLink>
          <NuxtLink to="/settings" class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition">Einstellungen</NuxtLink>
          <NuxtLink to="/logs" class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition">Logs</NuxtLink>
        </nav>
        
        <!-- Darkmode Toggle -->
        <div class="mt-6 flex items-center text-white">
          <button @click="toggleDarkMode" class="flex items-center justify-center p-2 rounded hover:bg-blue-800 dark:hover:bg-blue-800/60">
            <span v-if="isDarkMode" class="mr-2">🌙</span>
            <span v-else class="mr-2">☀️</span>
            {{ isDarkMode ? 'Dark Mode' : 'Light Mode' }}
          </button>
        </div>

        <div class="mt-8 text-white text-sm">
          <div class="flex items-center mb-2">
            <div class="w-3 h-3 rounded-full" 
                 :class="botActive ? 'bg-green-500' : 'bg-red-500'"
                 :title="botActive ? 'Bot ist online' : 'Bot ist offline'"></div>
            <span class="ml-2">Bot Status: {{ botActive ? 'Online' : 'Offline' }}</span>
          </div>
          <div class="text-xs opacity-70">Version 1.0.0</div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 p-6 text-gray-900 dark:text-gray-100">
        <NuxtPage />
      </main>
    </div>
    
    <!-- Toast Notifications -->
    <Toast />
  </div>
</template>

<script setup>
// Darkmode Composable importieren
const { isDarkMode, toggleDarkMode, init } = useDarkMode();
const botActive = ref(false);
const { showToast } = useToast();

// Bot Status regelmäßig prüfen
const checkBotStatus = async () => {
  try {
    const response = await fetch('/api/bot/status');
    const data = await response.json();
    if (data.success) {
      botActive.value = data.active;
    }
  } catch (error) {
    console.error('Fehler beim Prüfen des Bot-Status:', error);
    botActive.value = false; // Bei Fehler annehmen, dass Bot offline ist
    showToast('Fehler beim Prüfen des Bot-Status', 'error');
  }
};

// Bot-Status initial und dann alle 10 Sekunden prüfen
onMounted(() => {
  init(); // Darkmode initialisieren
  checkBotStatus(); // Initial prüfen
  
  // Regelmäßiges Prüfen einrichten
  const statusInterval = setInterval(checkBotStatus, 10000);
  
  // Cleanup beim Unmount
  onUnmounted(() => {
    clearInterval(statusInterval);
  });
});
</script>

<style>
body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Definiere die Klasse "antialiased" manuell anstatt @apply zu verwenden */
.antialiased {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
