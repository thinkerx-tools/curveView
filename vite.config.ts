import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { guiguProxyPlugin } from './server/viteGuiguPlugin.js'

// https://vite.dev/config/
export default defineConfig({
  base: '/curveView/',
  plugins: [react(), guiguProxyPlugin()],
  test: {
    environment: 'node',
  },
})
