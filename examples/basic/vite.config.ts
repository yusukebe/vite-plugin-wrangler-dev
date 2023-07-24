import { defineConfig } from '../../node_modules/vite'
import { wranglerDev } from '../../src'

export default defineConfig({
  plugins: [
    wranglerDev({
      entry: '/src/_worker.ts',
      client: '/src/client.ts',
      passThrough: ['/js/client.js']
    })
  ]
})
