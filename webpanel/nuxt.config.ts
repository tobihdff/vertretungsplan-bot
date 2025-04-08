// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, // Disable server-side rendering
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  
  // App head metadata
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }
      ]
    }
  },
  
  // Proxy-Konfiguration für API-Anfragen an den Bot
  nitro: {
    routeRules: {
      '/api/bot/**': {
        proxy: 'http://localhost:3001/api/bot/**'
      }
    }
  }
})