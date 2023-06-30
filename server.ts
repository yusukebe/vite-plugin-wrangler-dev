import express from 'express'
import { createServer as createViteServer, build as viteBuild } from 'vite'
import { getRequestListener } from '@hono/node-server'
import path from 'path'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker } from 'wrangler'

async function createServer() {
  let worker: UnstableDevWorker

  const rebuildAndRestart = async () => {
    await buildScript('./src/app.ts')
    worker = await unstable_dev('dist/app.mjs', {
      experimental: { disableExperimentalWarning: true },
      logLevel: 'info'
    })
  }

  const watchAndBuildPlugin = {
    name: 'watch-and-build',
    async handleHotUpdate({ file }: { file: string }) {
      if (file.startsWith(path.resolve(__dirname, './src/'))) {
        await rebuildAndRestart()
      }
    }
  }

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
    plugins: [watchAndBuildPlugin]
  })

  // Initial build
  await rebuildAndRestart()

  // Express as dev server
  const server = express()
  server.use(vite.middlewares)

  server.use('*', async (req, res) => {
    await vite.ssrLoadModule('/src/app.ts')
    req.url = req.originalUrl
    getRequestListener(async (workerRequest) => {
      const newResponse = await worker.fetch(workerRequest.url, workerRequest as any)
      return newResponse
    })(req, res)
  })

  server.listen(5173, () => {
    console.log('http://localhost:5173')
  })
}

async function buildScript(filename: string) {
  await viteBuild({
    ssr: {
      noExternal: true,
      format: 'esm'
    },
    build: {
      ssr: path.resolve(__dirname, filename),
      rollupOptions: {}
    }
  })
}

createServer()
