import { fileURLToPath, URL } from 'node:url'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// a prévia serve o detalhe pré-renderizado antes do fallback da spa
function previewPrerenderedPages(): Plugin {
  return {
    name: 'kurio:preview-prerendered-pages',
    configurePreviewServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
        const match = /^\/nft\/([a-zA-Z0-9-]+)\/?$/.exec(pathname)
        if (request.method !== 'GET' && request.method !== 'HEAD') return next()
        if (!match && (pathname === '/' || pathname.includes('.') || !request.headers.accept?.includes('text/html'))) return next()
        const base = path.resolve(server.config.root, server.config.build.outDir)
        const file = match ? path.join(base, 'nft', match[1], 'index.html') : path.join(base, 'spa.html')
        void readFile(file).then((html) => {
          response.setHeader('Content-Type', 'text/html; charset=utf-8')
          response.end(request.method === 'HEAD' ? undefined : html)
        }).catch(() => {
          void readFile(path.join(base, 'spa.html')).then((html) => {
            response.setHeader('Content-Type', 'text/html; charset=utf-8')
            response.end(request.method === 'HEAD' ? undefined : html)
          }).catch(() => next())
        })
      })
    },
  }
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), previewPrerenderedPages()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
