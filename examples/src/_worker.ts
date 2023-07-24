import { Hono } from 'hono'
import { html } from 'hono/html'
import type { MiddlewareHandler } from 'hono'

type Bindings = {
  TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', async (c) => {
  return c.html(
    html`<html>
      <body>
        <h1>Hello Wrangler!!</h1>
        <p>TOKEN is ${c.env.TOKEN}</p>
        <p><img src="/images/worker.png" /></p>
        <div id="root"></div>
        <script src="/js/client.js"></script>
      </body>
    </html>`
  )
})

// Serve static middleware for Pages
const serveStatic = (): MiddlewareHandler => {
  return async (c, _next) => {
    const env = c.env as { ASSETS: Fetcher }
    const res = await env.ASSETS.fetch(c.req.raw)
    if (res.status === 404) {
      return c.notFound()
    }
    return res
  }
}

app.get('/images/*', serveStatic())
app.get('/js/*', serveStatic())

export default app
