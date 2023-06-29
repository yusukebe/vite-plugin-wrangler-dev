import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { createServer as createViteServer } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://ja.vitejs.dev/guide/ssr.html

async function createServer() {
  const app = express()

  // ミドルウェアモードで Vite サーバを作成し、app type を 'custom' に指定します。
  // これにより、Vite 自体の HTML 配信ロジックが無効になり、親サーバが
  // 制御できるようになります。
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })

  // Vite の接続インスタンスをミドルウェアとして使用。独自の express ルータ
  // (express.Route()) を利用する場合は、router.use を使用してください
  app.use(vite.middlewares)

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl

    try {
      // 1. index.html を読み込む
      let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')

      // 2. Vite の HTML の変換を適用します。これにより Vite の HMR クライアントが定義され
      //    Vite プラグインからの HTML 変換も適用します。 e.g. global preambles
      //    from @vitejs/plugin-react
      template = await vite.transformIndexHtml(url, template)

      // 3. サーバサイドのエントリポイントを読み込みます。 ssrLoadModule は自動的に
      //    ESM を Node.js で使用できるコードに変換します! ここではバンドルは必要ありません
      //    さらに HMR と同様な効率的な無効化を提供します。
      const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')

      // 4. アプリケーションの HTML をレンダリングします。これは entry-server.js から
      //    エクスポートされた `render` 関数が、ReactDOMServer.renderToString() などの
      //    適切なフレームワークの SSR API を呼び出すことを想定しています。
      const appHtml = await render(url)

      // 5. アプリケーションのレンダリングされた HTML をテンプレートに挿入します。
      const html = template.replace(`<!--ssr-outlet-->`, appHtml)

      // 6. レンダリングされた HTML をクライアントに送ります。
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      // エラーが検出された場合は、Vite にスタックトレースを修正させ、実際のソースコードに
      // マップし直します。
      vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  app.listen(5173, () => {
    console.log('http://localhost:5173')
  })
}

createServer()
