import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // <-- Importamos el plugin de Tailwind v4

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // <-- Lo activamos aquí
  ],
})
