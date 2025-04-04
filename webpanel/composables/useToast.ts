import { ref, reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration: number
}

export default function useToast() {
  const toasts = reactive<Toast[]>([])
  let toastIdCounter = ref(0)

  const showToast = (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
    const id = toastIdCounter.value++
    const toast = {
      id,
      message,
      type,
      duration
    }
    
    // Add the toast to the list
    toasts.push(toast)
    
    // Set a timer to remove the toast
    if (duration > 0) {
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