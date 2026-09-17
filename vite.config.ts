import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Relativo: funciona en GitHub Pages Y en Capacitor (Android/iOS)
  base: './',
  build: {
    outDir: 'docs',
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})
