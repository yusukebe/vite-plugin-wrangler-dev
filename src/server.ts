import type http from 'http'
import path from 'path'
import { getRequestListener } from '@hono/node-server'
import type { Plugin, ViteDevServer, Connect, ModuleNode, InlineConfig } from 'vite'
import { build as viteBuild } from 'vite'
import { unstable_dev } from 'wrangler'
import type { UnstableDevWorker, UnstableDevOptions } from 'wrangler'

let worker: UnstableDevWorker | undefined

type WranglerDevOptions = {
  entry?: string
  client?: string
  assetDirectory?: string
  passThrough?: string[]
  wranglerDevOptions?: UnstableDevOptions
}

export function wranglerDev(options?: WranglerDevOptions): Plugin[] {
  const entry = options?.entry ?? './src/index.ts'
  const entryFileName = path.basename(entry)
  const workerPath = `./dist/${entryFileName.replace(/\.ts$/, '.js')}`

  const clientPath = options?.client

  const wranglerDevOptions: UnstableDevOptions = {
    experimental: {
      disableExperimentalWarning: true,
      liveReload: false,
      enablePagesAssetsServiceBinding: {
        directory: options?.assetDirectory ?? './public'
      }
    }
  }

  const ssrConfig: InlineConfig = {
    ssr: {
      noExternal: true,
      format: 'esm'
    },
    build: {
      ssr: entry
    }
  }

  const buildServer = async () => {
    await viteBuild(ssrConfig)
  }

  const plugins: Plugin[] = [
    {
      name: 'wrangler-dev',
      config: () => {
        return ssrConfig
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
        // TODO: Should validate
        if (file.endsWith(entryFileName)) {
          await buildServer()
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
        await buildServer()
        async function createMiddleware(server: ViteDevServer): Promise<Connect.HandleFunction> {
          return async function (
            req: http.IncomingMessage,
            res: http.ServerResponse,
            next: Connect.NextFunction
          ): Promise<void> {
            if (req.url) {
              if (
                req.url == clientPath ||
                req.url.startsWith('/@vite/client') ||
                req.url.startsWith('/@fs/') ||
                req.url.startsWith('/node_modules')
              ) {
                return next()
              }
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

                  if (options?.passThrough && req.url) {
                    if (options.passThrough.includes(req.url)) {
                      return new Response(null)
                    }
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
                    let body = (await newResponse.text()) + `<script type="module" src="/@vite/client"></script>`
                    if (clientPath) body = `${body}<script type="module" src="${clientPath}"></script>`
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
