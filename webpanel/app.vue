<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
    <!-- Mobile hamburger menu button -->
    <div class="md:hidden bg-blue-900 dark:bg-blue-950 p-4 flex justify-between items-center fixed top-0 left-0 right-0 z-30">
      <div class="text-white font-bold text-xl flex items-center">
        <span class="mr-2">📱</span> Vertretungsplan
      </div>
      <button @click="menuOpen = !menuOpen" class="text-white focus:outline-none menu-button">
        <div class="menu-icon" :class="{ 'open': menuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </button>
    </div>
    
    <!-- Container für das mobile Menü und den Overlay -->
    <div class="fixed inset-0 pointer-events-none z-20">
      <!-- Mobile menu overlay -->
      <div 
        v-if="menuOpen" 
        class="fixed inset-0 bg-black bg-opacity-50 md:hidden pointer-events-auto" 
        @click="menuOpen = false"
      ></div>
      
      <!-- Collapsible sidebar -->
      <aside 
        class="sidebar-transition bg-blue-900 dark:bg-blue-950 p-4 flex flex-col pointer-events-auto"
        :class="{
          'fixed top-0 left-0 right-0 bottom-auto max-h-[80vh] rounded-b-xl shadow-xl transform translate-y-0': menuOpen && window.innerWidth < 768,
          'fixed top-0 left-0 right-0 bottom-auto max-h-[80vh] rounded-b-xl shadow-xl transform -translate-y-full': !menuOpen && window.innerWidth < 768,
          'md:fixed md:top-0 md:bottom-0 md:left-0 md:right-auto md:transform-none md:h-screen md:max-h-none md:rounded-none': true,
          'md:w-64': !isCollapsed,
          'md:w-16': isCollapsed,
          'md:block': true,
          'md:items-center': isCollapsed,
          'z-25': true,
          'pt-16': window.innerWidth < 768,
          'overflow-y-auto overflow-x-hidden': true
        }"
      >
        <!-- Collapse/Expand button mit höherem z-index -->
        <button 
          @click="toggleSidebar" 
          class="hidden md:flex absolute -right-4 top-6 bg-white dark:bg-gray-800 rounded-full w-8 h-8 items-center justify-center text-blue-900 dark:text-white shadow-lg border border-blue-200 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors duration-200 !z-[1000]"
          :class="{'rotate-180': !isCollapsed}"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
        </button>

        <!-- Logo area -->
        <div 
          class="text-white font-bold text-xl mb-8 flex items-center md:mt-0"
          :class="{
            'justify-center w-full': isCollapsed,
            'hidden md:flex': true
          }"
        >
          <span class="mr-2">📱</span>
          <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Vertretungsplan</span>
        </div>

        <!-- Navigation -->
        <nav class="space-y-2">
          <NuxtLink 
            to="/" 
            class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center"
            :class="{'justify-center': isCollapsed}"
            @click="closeMenuOnMobile"
            :title="isCollapsed ? 'Dashboard' : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">📊</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Dashboard</span>
          </NuxtLink>
          <NuxtLink 
            to="/settings" 
            class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center"
            :class="{'justify-center': isCollapsed}"
            @click="closeMenuOnMobile"
            :title="isCollapsed ? 'Einstellungen' : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">⚙️</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Einstellungen</span>
          </NuxtLink>
          <NuxtLink 
            to="/logs" 
            class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center"
            :class="{'justify-center': isCollapsed}"
            @click="closeMenuOnMobile"
            :title="isCollapsed ? 'Logs' : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">📝</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Logs</span>
          </NuxtLink>
          <NuxtLink 
            to="/stats" 
            class="block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center"
            :class="{'justify-center': isCollapsed}"
            @click="closeMenuOnMobile"
            :title="isCollapsed ? 'Statistiken' : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">📈</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Statistiken</span>
          </NuxtLink>
        </nav>
        
        <!-- Darkmode Toggle -->
        <div class="mt-6 text-white">
          <button 
            class="block w-full px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center" 
            :class="{'justify-center': isCollapsed}"
            @click="toggleDarkMode" 
            :title="isCollapsed ? (isDarkMode ? 'Light Mode' : 'Dark Mode') : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">{{ isDarkMode ? '🌙' : '☀️' }}</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">{{ isDarkMode ? 'Dark Mode' : 'Light Mode' }}</span>
          </button>
        </div>

        <!-- Status area - nur auf Desktop angezeigt -->
        <div 
          class="text-white text-sm absolute bottom-4 left-0 right-0 px-4 hidden md:block" 
          :class="{'flex flex-col items-center': isCollapsed}"
        >
          <div 
            class="flex items-center mb-2"
            :class="{'justify-center': isCollapsed}"
          >
            <div class="relative">
              <div 
                class="w-3 h-3 rounded-full z-10 relative" 
                :class="botActive ? 'bg-green-500' : 'bg-red-500'"
                :title="botActive ? 'Bot ist online' : 'Bot ist offline'"
              ></div>
              <div 
                class="absolute top-0 left-0 w-3 h-3 rounded-full ripple-effect"
                :class="botActive ? 'ripple-green' : 'ripple-red'"
              ></div>
            </div>
            <span 
              :class="{
                'opacity-0 w-0 overflow-hidden': isCollapsed,
                'ml-2': !isCollapsed
              }"
            >Bot Status: {{ botActive ? 'Online' : 'Offline' }}</span>
          </div>
          <div 
            class="text-xs opacity-70" 
            :class="{'opacity-0 h-0 overflow-hidden': isCollapsed}"
          >Version 1.0.0</div>
        </div>
        
        <!-- Status-Bereich für mobiles Menü -->
        <div class="text-white text-sm mt-6 md:hidden">
          <div class="flex items-center mb-2">
            <div class="relative">
              <div 
                class="w-3 h-3 rounded-full z-10 relative" 
                :class="botActive ? 'bg-green-500' : 'bg-red-500'"
                :title="botActive ? 'Bot ist online' : 'Bot ist offline'"
              ></div>
              <div 
                class="absolute top-0 left-0 w-3 h-3 rounded-full ripple-effect"
                :class="botActive ? 'ripple-green' : 'ripple-red'"
              ></div>
            </div>
            <span class="ml-2">Bot Status: {{ botActive ? 'Online' : 'Offline' }}</span>
          </div>
          <div class="text-xs opacity-70">Version 1.0.0</div>
        </div>
      </aside>
    </div>

    <!-- Main Content -->
    <div class="min-h-screen">
      <!-- Main Content mit symmetrischen Abständen -->
      <main 
        class="transition-all duration-300 pt-[76px] md:pt-6" 
        :class="{
          'md:pl-[272px] md:pr-6': !isCollapsed, // 256px (sidebar) + 16px (padding links) + 24px (padding rechts)
          'md:pl-[80px] md:pr-6': isCollapsed,    // 64px (sidebar) + 16px (padding links) + 24px (padding rechts)
          'px-6': true, // Einheitlicher Abstand auf mobilen Geräten
          'text-gray-900 dark:text-gray-100': true
        }"
      >
        <NuxtLayout>
          <NuxtPage />
        </NuxtLayout>
      </main>
    </div>
    
    <!-- Toast Notifications -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useDarkMode } from './composables/useDarkMode';
import useToast from './composables/useToast';

// Füge am Anfang des <script setup> Bereichs hinzu:
definePageMeta({
  middleware: ['auth']
})

// Darkmode Composable importieren
const { isDarkMode, toggleDarkMode, init } = useDarkMode();
const botActive = ref(false);
const menuOpen = ref(false);
const isCollapsed = ref(false);
const hoverTimeout = ref(null);
const wasCollapsed = ref(false); // Track previous state
const { showToast } = useToast();
const window = ref(typeof globalThis !== 'undefined' ? globalThis : {innerWidth: 1024});

// Close menu on mobile when a link is clicked
const closeMenuOnMobile = () => {
  if (window.value.innerWidth < 768) {
    menuOpen.value = false;
  }
};

// Toggle sidebar expanded/collapsed state
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
  wasCollapsed.value = isCollapsed.value;
  if (import.meta.client) {
    localStorage.setItem('sidebarCollapsed', isCollapsed.value ? 'true' : 'false');
  }
};

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
    
    // Only show toast on client side
    if (import.meta.client) {
      showToast('Fehler beim Prüfen des Bot-Status', 'error');
    }
  }
};

// Initialize sidebar state from localStorage
const initSidebarState = () => {
  if (import.meta.client) {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      isCollapsed.value = savedState === 'true';
      wasCollapsed.value = isCollapsed.value;
    }
    window.value = globalThis.window;
  }
};

// Bot-Status initial und dann alle 10 Sekunden prüfen
onMounted(() => {
  init(); // Darkmode initialisieren
  initSidebarState(); // Sidebar state initialisieren
  checkBotStatus(); // Initial prüfen
  
  // Regelmäßiges Prüfen einrichten
  const statusInterval = setInterval(checkBotStatus, 10000);
  
  // Cleanup beim Unmount
  onUnmounted(() => {
    clearInterval(statusInterval);
    if (hoverTimeout.value) {
      clearTimeout(hoverTimeout.value);
    }
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

.sidebar-transition {
  transition: all 0.3s ease-in-out;
}

.sidebar-transition span {
  transition: opacity 0.2s ease, width 0.2s ease;
  white-space: nowrap;
}

.hover-area {
  cursor: pointer;
  background: transparent;
}

/* Main content transition */
main {
  transition: margin-left 0.3s ease;
}

/* Ripple-Effekt für den Status-Indikator */
.ripple-effect {
  animation: ripple 1.5s linear infinite;
}

@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* Unterschiedliche Farben für grün und rot */
.ripple-green {
  border: 2px solid rgba(34, 197, 94, 0.5);
}

.ripple-red {
  border: 2px solid rgba(239, 68, 68, 0.5);
}

/* Mobile menu transition */
.transform {
  transition: transform 0.3s ease;
}

/* Z-Index Hierarchie für Overlay und Sidebar */
.z-25 {
  z-index: 25;
}

/* Mobile menu transition - sorgt für flüssige Animation */
.transform {
  transition: transform 0.3s ease;
}

/* Animiertes Burger-Menü */
.menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  position: relative;
}

.menu-icon {
  width: 24px;
  height: 18px;
  position: relative;
  cursor: pointer;
}

.menu-icon span {
  display: block;
  position: absolute;
  height: 2px;
  width: 100%;
  background: white;
  border-radius: 2px;
  opacity: 1;
  left: 0;
  transform: rotate(0deg);
  transition: .25s ease-in-out;
}

.menu-icon span:nth-child(1) {
  top: 0px;
}

.menu-icon span:nth-child(2) {
  top: 8px;
}

.menu-icon span:nth-child(3) {
  top: 16px;
}

.menu-icon.open span:nth-child(1) {
  top: 8px;
  transform: rotate(135deg);
}

.menu-icon.open span:nth-child(2) {
  opacity: 0;
  left: -60px;
}

.menu-icon.open span:nth-child(3) {
  top: 8px;
  transform: rotate(-135deg);
}

/* Dropdown-Animation */
.transform {
  transition: transform 0.3s ease;
}

/* Z-Index-Hierarchie verbessern */
.z-40 {
  z-index: 40;
}

/* Verhindere Textumbruch und horizontales Scrollen in der Sidebar */
.overflow-x-hidden {
  overflow-x: hidden;
}

/* Stelle sicher, dass der Collapse-Button über dem Inhalt liegt */
button.z-40 {
  position: absolute;
  right: -16px;
}
</style>
