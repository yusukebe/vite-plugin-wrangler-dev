import { defineConfig } from '../../node_modules/vite'
import { wranglerDev } from '../../src'

export default defineConfig({
  plugins: [wranglerDev()]
})
