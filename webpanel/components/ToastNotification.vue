<template>
  <ClientOnly>
    <div class="fixed bottom-5 right-5 z-[9999] space-y-3 max-w-md">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id" 
          class="toast-item flex items-center p-3 rounded-md shadow-lg text-white"
          :class="toastClasses(toast.type)"
        >
          <span class="mr-2 text-lg">
            <span v-if="toast.type === 'success'">✅</span>
            <span v-else-if="toast.type === 'error'">❌</span>
            <span v-else-if="toast.type === 'warning'">⚠️</span>
            <span v-else>ℹ️</span>
          </span>
          <div class="flex-1">{{ toast.message }}</div>
          <button 
            class="ml-2 text-sm opacity-70 hover:opacity-100"
            @click="removeToast(toast.id)" 
          >
            ×
          </button>
        </div>
      </transition-group>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import useToast from '../composables/useToast';

const { toasts, removeToast } = useToast();

const toastClasses = (type: string) => {
  switch (type) {
    case 'success':
      return 'bg-green-600';
    case 'error':
      return 'bg-red-600';
    case 'warning':
      return 'bg-yellow-600';
    case 'info':
    default:
      return 'bg-blue-600';
  }
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.toast-item {
  max-width: 24rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
}
</style>