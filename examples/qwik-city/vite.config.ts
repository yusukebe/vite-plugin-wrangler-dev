import { defineConfig } from 'vite'
import { qwikVite } from '@builder.io/qwik/optimizer'
import { qwikCity } from '@builder.io/qwik-city/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import wranglerDev from '../../src'

export default defineConfig(() => {
  return {
    plugins: [
      wranglerDev({
        entry: '/src/_worker.ts',
        workerPath: './server/_worker.mjs'
      }),
      qwikCity(),
      qwikVite(),
      tsconfigPaths()
    ],
    preview: {
      headers: {
        'Cache-Control': 'public, max-age=600'
      }
    }
  }
})
