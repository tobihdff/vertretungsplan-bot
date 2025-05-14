import { defineStore } from 'pinia'
import { AppwriteException } from 'appwrite'

interface User {
  $id: string;
  email: string;
  name: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  tokenExpiry: number | null;
  tokenRenewalTimeout: number | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    isAuthenticated: false,
    user: null,
    token: null,
    tokenExpiry: null,
    tokenRenewalTimeout: null
  }),

  actions: {
    async login(email: string, password: string): Promise<boolean> {
      const { $account } = useNuxtApp()
      
      try {
        // Create email session
        await $account.createEmailPasswordSession(email, password)
        
        // Get user information
        const user = await $account.get()
        
        // Create JWT
        const jwt = await $account.createJWT()
        
        this.isAuthenticated = true
        this.user = {
          $id: user.$id,
          email: user.email,
          name: user.name
        }
        this.token = jwt.jwt
        this.tokenExpiry = Date.now() + 14 * 60 * 1000 // 14 minutes
        
        // Setup token renewal
        this.setupTokenRenewal()
        
        return true
      } catch (error) {
        if (error instanceof AppwriteException) {
          console.error('Login failed:', error.message)
        } else {
          console.error('Unexpected error during login:', error)
        }
        this.clearAuth()
        return false
      }
    },

    async logout(): Promise<void> {
      const { $account } = useNuxtApp()
      
      try {
        await $account.deleteSession('current')
        this.clearAuth()
      } catch (error) {
        if (error instanceof AppwriteException) {
          console.error('Logout failed:', error.message)
        } else {
          console.error('Unexpected error during logout:', error)
        }
        // Clear auth state even if logout fails
        this.clearAuth()
      }
    },

    clearAuth(): void {
      this.isAuthenticated = false
      this.user = null
      this.token = null
      this.tokenExpiry = null
      if (this.tokenRenewalTimeout) {
        clearTimeout(this.tokenRenewalTimeout)
        this.tokenRenewalTimeout = null
      }
    },

    async renewToken(): Promise<void> {
      const { $account } = useNuxtApp()
      
      try {
        const jwt = await $account.createJWT()
        this.token = jwt.jwt
        this.tokenExpiry = Date.now() + 14 * 60 * 1000 // 14 minutes
        this.setupTokenRenewal()
      } catch (error) {
        console.error('Token renewal failed:', error)
        // If token renewal fails, force logout
        await this.logout()
      }
    },

    setupTokenRenewal(): void {
      if (this.tokenRenewalTimeout) {
        clearTimeout(this.tokenRenewalTimeout)
      }
      
      // Renew token after 14 minutes
      this.tokenRenewalTimeout = window.setTimeout(() => {
        this.renewToken()
      }, 14 * 60 * 1000) // 14 minutes
    },

    async checkAuth(): Promise<boolean> {
      const { $account } = useNuxtApp()
      
      try {
        const user = await $account.get()
        
        // If we have a valid session but no token, create a new one
        if (!this.token || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
          const jwt = await $account.createJWT()
          this.token = jwt.jwt
          this.tokenExpiry = Date.now() + 14 * 60 * 1000 // 14 minutes
          this.setupTokenRenewal()
        }
        
        this.isAuthenticated = true
        this.user = {
          $id: user.$id,
          email: user.email,
          name: user.name
        }
        return true
      } catch (error) {
        if (error instanceof AppwriteException) {
          console.error('Auth check failed:', error.message)
        }
        this.clearAuth()
        return false
      }
    }
  }
}) 