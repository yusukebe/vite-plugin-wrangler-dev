import express from 'express'
import { createServer as createViteServer, build as viteBuild } from 'vite'
import { getRequestListener } from '@hono/node-server'
import path from 'path'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker, UnstableDevOptions } from 'wrangler'

const DEFAULT_PORT = 5173

export type CreateServerOptions = {
  entry?: string
  outFile?: string
  watchDir?: string
  port?: number
  wranglerOptions?: UnstableDevOptions
}

export const createServer = async (options?: CreateServerOptions) => {
  const entry = options?.entry ?? './src/app.ts'
  const outFile = options?.outFile ?? './dist/app.mjs'
  const watchDir = options?.watchDir ?? './src'
  const port = options?.port ?? DEFAULT_PORT
  const wranglerOptions = options?.wranglerOptions ?? {
    experimental: { disableExperimentalWarning: true },
    logLevel: 'info'
  }

  let worker: UnstableDevWorker

  const rebuildAndRestart = async () => {
    await buildScript(entry)
    worker = await unstable_dev(outFile, wranglerOptions)
  }

  const watchAndBuildPlugin = {
    name: 'watch-and-build',
    async handleHotUpdate({ file }: { file: string }) {
      if (file.startsWith(path.resolve(process.cwd(), watchDir))) {
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

  // Express as a dev server
  // I don't want to use it...
  const server = express()
  server.use(vite.middlewares)

  server.use('*', async (req, res) => {
    await vite.ssrLoadModule(entry)
    req.url = req.originalUrl
    getRequestListener(async (workerRequest) => {
      const newResponse = await worker.fetch(workerRequest.url, workerRequest as any)
      if (newResponse.headers.get('content-type')?.match(/^text\/html/)) {
        const body = (await newResponse.text()) + '<script type="module" src="/@vite/client"></script>'
        const headers = new Headers(newResponse.headers)
        headers.delete('content-length')
        return new Response(body, {
          status: newResponse.status,
          headers
        })
      }
      return newResponse
    })(req, res)
  })

  server.listen(port, () => {
    console.log(`[Vite] Running on http://localhost:${port}`)
  })
}

async function buildScript(filename: string) {
  await viteBuild({
    ssr: {
      noExternal: true,
      format: 'esm'
    },
    build: {
      ssr: path.resolve(process.cwd(), filename),
      rollupOptions: {}
    }
  })
}
