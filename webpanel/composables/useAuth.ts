import { useAuthStore } from '~/stores/auth'
import { useRouter, useRoute } from 'vue-router'

export const useAuth = () => {
  const authStore = useAuthStore()
  const router = useRouter()
  const route = useRoute()

  const login = async (username: string, password: string) => {
    try {
      const success = await authStore.login(username, password)
      if (success) {
        // Force a hard navigation to trigger layout change
        window.location.href = '/'
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = async () => {
    try {
      await authStore.logout()
      await router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const checkAuth = async () => {
    return await authStore.checkAuth()
  }

  return {
    login,
    logout,
    checkAuth,
    isAuthenticated: authStore.isAuthenticated,
    user: authStore.user
  }
} 