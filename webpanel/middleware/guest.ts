import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((_to, _from) => {
  const auth = useAuthStore()
  
  if (auth.isAuthenticated) {
    return navigateTo('/dashboard')
  }
}) 