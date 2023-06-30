import express from 'express'
import { createServer as createViteServer } from 'vite'
import { Hono } from 'hono'
import { getRequestListener } from '@hono/node-server'

async function createServer() {
  const server = express()

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })

  server.use(vite.middlewares)

  server.use('*', async (req, res) => {
    const { app } = (await vite.ssrLoadModule('/src/app.ts')) as { app: Hono }

    req.url = req.originalUrl
    getRequestListener(app.fetch)(req, res)
  })

  server.listen(5173, () => {
    console.log('http://localhost:5173')
  })
}

createServer()
