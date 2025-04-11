// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  ssr: false, // Disable server-side rendering
  compatibilityDate: '2024-11-01',
  devtools: { enabled: process.env.NODE_ENV !== 'production' }, // Nur im Dev-Modus aktivieren
  
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/tailwindcss',
    '@nuxt/image', // Für optimierte Bildverarbeitung
  ],
  
  // App head metadata
  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' }
      ],
    }
  },
  
  // Optimierte Proxy-Konfiguration für API-Anfragen an den Bot
  nitro: {
    compressPublicAssets: true, // Aktiviert Gzip-Kompression für öffentliche Assets
    routeRules: {
      '/api/bot/**': {
        proxy: 'http://localhost:3001/api/bot/**',
        cache: {
          maxAge: 10, // 10 Sekunden Cache für API-Antworten
        }
      },
      '/_nuxt/**': {
        headers: {
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      },
      '/_nuxt/**.css': {
        headers: {
          'Content-Type': 'text/css; charset=utf-8',
        },
      },
      '/_nuxt/**.js': {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
        },
      },
      // Stellen Sie sicher, dass .mjs-Dateien mit dem richtigen MIME-Type serviert werden
      '/_nuxt/**.mjs': {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
        },
      },
      '/api/system/stats': {
        cache: {
          maxAge: 5, // 5 Sekunden Cache für Statistikdaten
        }
      },
      '/**': {
        headers: {
          'Cache-Control': 'no-cache',
        },
      },
    },
    // Performance-Optimierungen für Nitro-Server
    minify: true,
  },

  // Bildoptimierung
  image: {
    formats: ['webp', 'avif'], // Aktiviert moderne Bildformate
    provider: 'static',
    presets: {
      default: {
        modifiers: {
          format: 'webp',
          quality: 80,
        },
      },
    },
  },
  
  // Optimierungen für die Build-Phase
  build: {
    transpile: [],
    analyze: process.env.ANALYZE === 'true', // Bundle-Analyse bei Bedarf aktivieren
  },
  
  // Experimentelle Features für bessere Performance
  experimental: {
    asyncContext: true,
    payloadExtraction: true,
  },

  // Optimiere CSS-Output
  postcss: {
    plugins: {
      'postcss-import': {},
      'tailwindcss/nesting': {},
    },
  },
})