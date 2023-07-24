# vite-plugin-wrangler-dev

**vite-plugin-wrangler-dev** is a Vite Plugin designed for the development of Cloudflare Workers or Cloudflare Pages.
It allows the "wrangler dev server" to run inside of Vite, makes the use of Workers Bindings possible for Vite-based web frameworks.

## Demo

https://github.com/yusukebe/vite-plugin-wrangler-dev/assets/10682/0389d781-c18d-4af4-ab07-b41948cf252d

## Status

WIP. It's not published yet.

## Usage

```ts
import { defineConfig } from 'vite'
import vitePluginWranglerDev from '../src'

export default defineConfig({
  plugins: [
    vitePluginWranglerDev({
      entry: '/src/_worker.ts',
      client: '/src/client.ts',
      passThrough: ['/js/client.js']
    })
  ]
})
```

## Options

```ts
type WranglerDevOptions = {
  entry?: string
  client?: string
  assetDirectory?: string
  passThrough?: string[]
  wranglerDevOptions?: UnstableDevOptions
}
```

## Authors

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
