import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Rapier ships a .wasm asset; ensure Vite serves it correctly in dev and bundles it in build.
  optimizeDeps: {
    exclude: ['@react-three/rapier'],
  },
})
