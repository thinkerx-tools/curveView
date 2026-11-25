import type { Plugin } from 'vite'
import { fetchSelectedLastCurve } from './guiguProxy.js'

export function guiguProxyPlugin(): Plugin {
  return {
    name: 'guigu-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/guigu/selected-curve')) {
          next()
          return
        }
        try {
          const result = await fetchSelectedLastCurve()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.statusCode = result.ok ? 200 : 502
          res.end(JSON.stringify(result))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : String(e),
            }),
          )
        }
      })
    },
  }
}
