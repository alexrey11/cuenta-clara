import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/cuenta-clara/', // Importante para GitHub Pages
  build: {
    outDir: 'docs', // <-- ESTO LE DICE A VITE QUE GUARDE AQUÍ
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
})