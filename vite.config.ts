import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/cuenta-clara/', // <--- ¡ESTA LÍNEA ES LA CLAVE!
  plugins: [
    react(),
    tailwindcss(),
  ],
})