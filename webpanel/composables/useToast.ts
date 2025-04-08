import { ref, reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

// Create global state using Vue's reactivity to ensure it's compatible with SSR
let __toasts: Toast[] | null = null;
let __counter = 0;

export default function useToast() {
  // Initialize the state only once
  if (!__toasts) {
    __toasts = reactive<Toast[]>([]);
  }
  
  const toasts = __toasts;
  
  const showToast = (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
    const id = __counter++;
    const toast = {
      id,
      message,
      type,
      duration
    }
    
    // Add the toast to the list
    toasts.push(toast)
    
    // Only set timeout on client side
    if (import.meta.client && duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
    
    return id
  }
  
  const removeToast = (id: number) => {
    const index = toasts.findIndex(toast => toast.id === id)
    if (index !== -1) {
      toasts.splice(index, 1)
    }
  }

  return {
    toasts,
    showToast,
    removeToast
  }
}