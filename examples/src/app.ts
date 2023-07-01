import { Hono } from 'hono'
import { html } from 'hono/html'

type Bindings = {
  TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/', (c) => {
  return c.html(
    html`<html>
      <body>
        <h1>Hello Wrangler!</h1>
        <p>TOKEN is ${c.env.TOKEN}</p>
      </body>
    </html>`
  )
})

app.get('/api', (c) => c.json({ message: 'Hello Vite!!' }))

export default app
