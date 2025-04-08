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
            <label :for="inputId" class="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{{ label }}</label>
            <div class="relative">
              <input 
                :id="inputId" 
                type="text" 
                v-model="inputValue" 
                class="w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200"
                :placeholder="placeholder"
                @keyup.enter="confirm"
              />
              <div 
                v-if="inputValue" 
                @click="inputValue = ''"
                class="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
              >
                <span class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 101.414 1.414L10 11.414l1.293 1.293a1 1 001.414-1.414L11.414 10l1.293-1.293a1 1 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </span>
              </div>
            </div>
            <p v-if="helpText" class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ helpText }}</p>
          </div>
          
          <div class="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end space-x-3">
            <button 
              @click="cancel" 
              class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
            >
              Abbrechen
            </button>
            <button 
              @click="confirm" 
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
              :class="{'opacity-50 cursor-not-allowed': !inputValue.trim()}"
              :disabled="!inputValue.trim()"
            >
              Bestätigen
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup>
import { ref, defineProps, defineEmits, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps({
  title: {
    type: String,
    default: 'Eingabe erforderlich'
  },
  label: {
    type: String,
    default: 'Bitte geben Sie einen Wert ein:'
  },
  placeholder: {
    type: String,
    default: ''
  },
  helpText: {
    type: String,
    default: ''
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  initialValue: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['confirm', 'cancel']);
const inputValue = ref(props.initialValue);
const inputId = ref(`input-${uuidv4()}`);

// Reset input value when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    inputValue.value = props.initialValue;
  }
});

// Focus input when modal opens
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    setTimeout(() => {
      document.getElementById(inputId.value)?.focus();
    }, 100);
  }
});

function confirm() {
  if (inputValue.value.trim()) {
    emit('confirm', inputValue.value);
  }
}

function cancel() {
  emit('cancel');
}
</script>