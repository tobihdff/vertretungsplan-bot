// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  
  // Proxy-Konfiguration für API-Anfragen an den Bot
  nitro: {
    routeRules: {
      '/api/bot/**': {
        proxy: 'http://localhost:3001/api/bot/**'
      }
    }
  }
})