import { Hono } from 'hono'
import { html } from 'hono/html'

const app = new Hono()

app.get('/', (c) => {
  return c.html(
    html`<html>
      <body>
        <h1>Hello Vite!!</h1>
        <script type="module" src="/@vite/client"></script>
      </body>
    </html>`
  )
})

app.get('/api', (c) => c.json({ message: 'Hello Vite!!' }))

export { app }
