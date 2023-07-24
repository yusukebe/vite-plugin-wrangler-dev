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
  workerPath?: string
  client?: string
  srcDirectoryName?: string
  assetDirectory?: string
  passThrough?: string[]
  wranglerDevOptions?: UnstableDevOptions
}

function wranglerDev(options?: WranglerDevOptions): Plugin[] {
  const entry = options?.entry ?? './src/index.ts'
  const entryFileName = path.basename(entry)
  const workerPath = options?.workerPath ?? `./dist/${entryFileName.replace(/\.ts$/, '.js')}`
  const srcDirectoryName = options?.srcDirectoryName ?? 'src'
  const clientPath = options?.client

  const wranglerDevOptions: UnstableDevOptions = {
    experimental: {
      disableExperimentalWarning: true,
      watch: false,
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
      name: 'vite-plugin-wrangler-dev',
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
        if (file.includes(srcDirectoryName)) {
          await buildServer()
          if (worker) {
            console.log('start stop', worker.port)
            await worker.stop()
            worker = undefined
          }
          worker = await unstable_dev(workerPath, wranglerDevOptions)
          console.log('start worker', worker.port)
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
                // TODO: Support multiple client files
                req.url == clientPath ||
                req.url.startsWith('/@vite/client') ||
                req.url.startsWith('/@fs/') ||
                req.url.startsWith('/node_modules')
              ) {
                return next()
              }
            }

            // TODO: Check an app is exporting `default`
            // const appModule = await server.ssrLoadModule(entry)
            // const app = appModule['default']
            const app = true

            if (!app) {
              console.error(`Failed to find a named export "default" from ${entry}`)
            } else {
              getRequestListener(async (workerRequest) => {
                try {
                  if (options?.passThrough && req.url) {
                    if (options.passThrough.includes(req.url)) {
                      return new Response(null)
                    }
                  }

                  if (!worker) {
                    worker = await unstable_dev(workerPath, wranglerDevOptions)
                  }

                  console.log('worker fetch', worker.port)

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
                    // @ts-ignore
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

export default wranglerDev
