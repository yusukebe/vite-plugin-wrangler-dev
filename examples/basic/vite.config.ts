import { defineConfig } from '../../node_modules/vite'
import vitePluginWranglerDev from '../../src'

export default defineConfig({
  plugins: [
    vitePluginWranglerDev({
      entry: '/src/_worker.ts',
      client: '/src/client.ts',
      passThrough: ['/js/client.js']
    })
  ]
})
