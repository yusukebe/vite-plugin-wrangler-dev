import type http from 'http'
import path from 'path'
import { getRequestListener } from '@hono/node-server'
import type { Plugin, ViteDevServer, Connect, ModuleNode, InlineConfig } from 'vite'
import { build as viteBuild } from 'vite'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker, UnstableDevOptions } from 'wrangler'

let worker: UnstableDevWorker | undefined
const wranglerDevOptions: UnstableDevOptions = {
  experimental: { disableExperimentalWarning: true, liveReload: false },
  logLevel: 'debug'
}

type SonikViteServerOptions = {
  port?: number
  entry?: string
  wranglerDevOptions?: UnstableDevOptions
  insertClientScript?: boolean
}

export function wranglerDev(options?: SonikViteServerOptions): Plugin[] {
  const entry = options?.entry ?? './src/index.ts'
  const workerPath = './dist/index.js'

  const ssrConfig: InlineConfig = {
    ssr: {
      noExternal: true,
      format: 'esm'
    },
    build: {
      rollupOptions: {
        external: ['__STATIC_CONTENT_MANIFEST']
      },
      ssr: entry
    }
  }

  const buildServer = async () => {
    await viteBuild(ssrConfig)
  }

  const plugins: Plugin[] = [
    {
      name: 'vite-plugin-wrangler',
      // Ignore '__STATIC_CONTENT_MANIFEST'
      resolveId(id) {
        if (id === '__STATIC_CONTENT_MANIFEST') {
          return id
        }
      },
      load(id) {
        if (id === '__STATIC_CONTENT_MANIFEST') {
          return ''
        }
      },
      handleHotUpdate: async ({
        file,
        modules,
        server
      }: {
        file: string
        modules: Array<ModuleNode>
        server: ViteDevServer
      }) => {
        if (file.startsWith(path.resolve(process.cwd(), 'src'))) {
          Promise.all([await buildServer()])
          if (worker) worker.stop()
          worker = await unstable_dev(workerPath, wranglerDevOptions)
          if (modules.length === 0) {
            server.ws.send({
              type: 'full-reload'
            })
          }
        }
      },
      configureServer: async (server) => {
        Promise.all([await buildServer()])
        async function createMiddleware(server: ViteDevServer): Promise<Connect.HandleFunction> {
          return async function (
            req: http.IncomingMessage,
            res: http.ServerResponse,
            next: Connect.NextFunction
          ): Promise<void> {
            if (
              req.url?.endsWith('.ts') ||
              req.url?.startsWith('/@vite/client') ||
              req.url?.startsWith('/@fs/') ||
              req.url?.startsWith('/node_modules')
            ) {
              return next()
            }

            const appModule = await server.ssrLoadModule(entry)
            const app = appModule['default']

            if (!app) {
              console.error(`Failed to find a named export "default" from ${entry}`)
            } else {
              getRequestListener(async (workerRequest) => {
                try {
                  if (!worker) {
                    worker = await unstable_dev(workerPath, wranglerDevOptions)
                  }
                  const newResponse = await worker.fetch(workerRequest.url, {
                    method: workerRequest.method,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    headers: workerRequest.headers,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    body: workerRequest.body,
                    duplex: 'half',
                    redirect: 'manual'
                  })

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
                } catch (e) {
                  console.log(e)
                }
              })(req, res)
            }
          }
        }

        server.middlewares.use(await createMiddleware(server))
      }
    }
  ]
  return plugins
}
