import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.js',
      strategies: 'injectManifest',
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST'
      },
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['favicon.svg', 'logo.png'],
      manifest: {
        name: 'Swami Ji Matka',
        short_name: 'SwamiJi',
        description: 'Official SWAMI JI MATKA Android Application',
        theme_color: '#FF6600',
        background_color: '#FFD200',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
