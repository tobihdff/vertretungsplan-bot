import { useAuthStore } from '~/stores/auth'

export interface BotSettings {
  planChannelId?: string;
  notificationChannelId?: string;
  updateRoleId?: string;
  authorizedUsers?: string;
  updateInterval?: number;
  checkInterval?: number;
  apiUrl?: string;
  apiKey?: string;
  debugMode?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
}

export const useApi = () => {
  const authStore = useAuthStore()

  const fetchWithAuth = async <T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> => {
    try {
      // Ensure we have a valid token
      if (!authStore.token || Date.now() >= (authStore.tokenExpiry || 0)) {
        await authStore.renewToken()
      }

      // Ensure the token is available
      if (!authStore.token) {
        throw new Error('No authentication token available')
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      }

      const response = await fetch(`/api/bot${endpoint}`, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers || {})
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        data
      }
    } catch (error) {
      console.error('API request failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  // API endpoints
  const getBotStatus = () => fetchWithAuth<{
    active: boolean;
    maintenanceMode: boolean;
    lastUpdate: string;
    recentActivities: Array<{
      type: string;
      message: string;
      timestamp: string;
    }>;
  }>('/status')
  
  const getBotSettings = () => fetchWithAuth<BotSettings>('/settings')
  const updateBotSettings = (settings: BotSettings) => 
    fetchWithAuth('/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    })
  const restartBot = () => 
    fetchWithAuth('/restart', { method: 'POST' })
  const toggleMaintenance = (enable: boolean) => 
    fetchWithAuth('/maintenance', {
      method: 'POST',
      body: JSON.stringify({ enable })
    })
  const forceUpdate = () => 
    fetchWithAuth('/force-update', { method: 'POST' })
  const testNotification = () => 
    fetchWithAuth('/test-notification', { method: 'POST' })
  const testPlan = () => 
    fetchWithAuth('/test-plan', { method: 'POST' })
  const testUpdate = () => 
    fetchWithAuth('/test-update', { method: 'POST' })
  const clearChannel = () => 
    fetchWithAuth('/clear-channel', { method: 'POST' })
  const getLogs = () => fetchWithAuth('/logs')
  const clearLogs = () => fetchWithAuth('/logs', { method: 'DELETE' })
  const setLogLevel = (level: string) => 
    fetchWithAuth('/log-level', {
      method: 'POST',
      body: JSON.stringify({ level })
    })
  const getActivities = () => fetchWithAuth('/activities')

  return {
    getBotStatus,
    getBotSettings,
    updateBotSettings,
    restartBot,
    toggleMaintenance,
    forceUpdate,
    testNotification,
    testPlan,
    testUpdate,
    clearChannel,
    getLogs,
    clearLogs,
    setLogLevel,
    getActivities
  }
} 