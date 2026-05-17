/// <reference types="vitest" />
import { defineConfig } from 'vitest/config' // <--- EL CAMBIO ESTÁ AQUÍ
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'SafeEvent - Red de Auxilio',
        short_name: 'SafeEvent',
        description: 'Sistema de emergencia para eventos masivos',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],

  optimizeDeps: {
    exclude: ['@safe-event/shared-types']
  },

  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  }
})