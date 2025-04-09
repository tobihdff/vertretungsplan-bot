<template>
  <Transition
    enter-active-class="ease-out duration-300"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="ease-in duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-if="isOpen" class="fixed inset-0 flex items-center justify-center z-50 p-4">
      <!-- Overlay -->
      <div class="absolute inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 backdrop-blur-sm" @click="cancel"></div>
      
      <!-- Modal -->
      <Transition
        enter-active-class="ease-out duration-300"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
        enter-to-class="opacity-100 translate-y-0 sm:scale-100"
        leave-active-class="ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
      >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-auto z-10 overflow-hidden transition-all transform">
          <div class="p-5 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ title }}</h3>
            <button 
              @click="cancel" 
              class="text-gray-400 hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-300 focus:outline-none transition-colors"
              aria-label="Close"
            >
              <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="p-6">
            <div class="flex items-start">
              <div class="flex-shrink-0 mt-0.5 mr-4">
                <span class="flex items-center justify-center h-10 w-10 rounded-full" :class="iconBackgroundClass">
                  <svg class="h-6 w-6" :class="iconColorClass" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path v-if="type === 'danger'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    <path v-else-if="type === 'warning'" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
              </div>
              <div>
                <p class="text-gray-700 dark:text-gray-300 font-medium">{{ message }}</p>
                <div v-if="details" class="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {{ details }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
            <button 
              @click="cancel" 
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              {{ cancelButtonText }}
            </button>
            <button 
              @click="confirm" 
              :class="[confirmButtonClass, 'px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors shadow-sm']"
            >
              {{ confirmButtonText }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    default: 'Bestätigung'
  },
  message: {
    type: String,
    default: 'Möchten Sie diese Aktion wirklich ausführen?'
  },
  details: {
    type: String,
    default: ''
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  confirmButtonText: {
    type: String,
    default: 'Bestätigen'
  },
  cancelButtonText: {
    type: String,
    default: 'Abbrechen'
  },
  type: {
    type: String,
    default: 'primary', // primary, danger, warning
    validator: (value) => ['primary', 'danger', 'warning'].includes(value)
  }
});

const emit = defineEmits(['confirm', 'cancel']);

// Bestimmt die Klassen für den Bestätigungs-Button basierend auf dem Typ
const confirmButtonClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
    case 'warning':
      return 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500';
    case 'primary':
    default:
      return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
  }
});

// Bestimmt die Hintergrundfarbe des Icons
const iconBackgroundClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'bg-red-100 dark:bg-red-900/40';
    case 'warning':
      return 'bg-yellow-100 dark:bg-yellow-900/40';
    case 'primary':
    default:
      return 'bg-blue-100 dark:bg-blue-900/40';
  }
});

// Bestimmt die Textfarbe des Icons
const iconColorClass = computed(() => {
  switch (props.type) {
    case 'danger':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'primary':
    default:
      return 'text-blue-600 dark:text-blue-400';
  }
});

function confirm() {
  emit('confirm');
}

function cancel() {
  emit('cancel');
}
</script>