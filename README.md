# Wrangler Vite Server

Write Web with Wrangler, Fast!

## What's this?

I frequently develop web pages using Cloudflare Workers, not Pages. In this process, the `wrangler dev --live-reload` command has proven to be quite helpful.

On the other hand, the dev server provided by Vite is remarkable due to its speedy hot-module-replacement (HMR) feature. Therefore, I would love to use it for developing my web pages. However, integrating Cloudflare Bindings, such as Variables, KV, R2, and D1, poses some difficulty.

My objective is to leverage the speed of Vite while retaining the Bindings offered by Wrangler. This is where the Wrangler Vite Server comes into play, providing the best of both worlds.

## How to Use

```ts
// server.ts
import { createServer } from 'xxx'

createServer()
```

```
tsx server.ts
```

## Options

```ts
type CreateServerOptions = {
  entry?: string
  outFile?: string
  watchDir?: string
  port?: number
  wranglerOptions?: UnstableDevOptions
}
```


## Related projects

* [leader22/cfw-bindings-wrangler-bridge](https://github.com/leader22/cfw-bindings-wrangler-bridge)

## Authors

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
