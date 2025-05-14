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
          'fixed top-0 left-0 right-0 bottom-auto max-h-[80vh] rounded-b-xl shadow-xl transform translate-y-0': menuOpen && isMobile,
          'fixed top-0 left-0 right-0 bottom-auto max-h-[80vh] rounded-b-xl shadow-xl transform -translate-y-full': !menuOpen && isMobile,
          'md:fixed md:top-0 md:bottom-0 md:left-0 md:right-auto md:transform-none md:h-screen md:max-h-none md:rounded-none': true,
          'md:w-64': !isCollapsed,
          'md:w-16': isCollapsed,
          'md:block': true,
          'md:items-center': isCollapsed,
          'z-25': true,
          'pt-16': isMobile,
          'overflow-y-auto overflow-x-hidden': true
        }"
      >
        <!-- Collapse/Expand button -->
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
          
          <!-- Logout Button -->
          <button 
            @click="handleLogout"
            class="w-full block px-4 py-2 rounded text-white hover:bg-blue-800 dark:hover:bg-blue-800/60 transition flex items-center"
            :class="{'justify-center': isCollapsed}"
            :title="isCollapsed ? 'Abmelden' : ''"
          >
            <span :class="{'mr-0': isCollapsed, 'mr-2': !isCollapsed}">🚪</span>
            <span :class="{'opacity-0 w-0 overflow-hidden': isCollapsed}">Abmelden</span>
          </button>
        </nav>
      </aside>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col md:flex-row">
      <!-- Main Content mit korrektem Abstand -->
      <main 
        class="flex-1 md:p-6 transition-all duration-300 md:mt-0 mt-4 mb-[76px] md:pt-6" 
        :class="{
          'md:ml-52': !isCollapsed,
          'md:ml-16': isCollapsed, 
          'ml-0': true,
          'text-gray-900 dark:text-gray-100': true
        }"
      >
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const authStore = useAuthStore()
const menuOpen = ref(false)
const isCollapsed = ref(false)
const windowWidth = ref(0)

const isMobile = computed(() => windowWidth.value < 768)

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}

onMounted(() => {
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})

const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value
}

const closeMenuOnMobile = () => {
  if (isMobile.value) {
    menuOpen.value = false
  }
}
</script>

<style>
/* Your existing styles */
</style> 