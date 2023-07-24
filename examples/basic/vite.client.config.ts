import { defineConfig } from '../../node_modules/vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/client.ts',
      formats: ['es'],
      fileName: 'client',
      name: 'client'
    },
    outDir: './dist/js'
  },
  publicDir: false
})
