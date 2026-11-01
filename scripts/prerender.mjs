import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createServer } from 'vite'

const output = path.resolve(process.env.PRERENDER_OUT_DIR || 'dist')
const template = (await readFile(path.join(output, 'index.html'), 'utf8'))
  .replace('</head>', '<link rel="preload" as="font" type="font/woff2" href="/fonts/RobotoMono-Variable.woff2" crossorigin></head>')
await writeFile(path.join(output, 'spa.html'), template)
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { fixtureIds, renderPage } = await vite.ssrLoadModule('/src/prerender.tsx')
  for (const url of ['/', ...fixtureIds().map((id) => `/nft/${encodeURIComponent(id)}`)]) {
    const { html, state } = await renderPage(url)
    // mover os preloads de imagens para o head antes da hidratação
    const hints = html.match(/^(?:<link rel="preload"[^>]*\/>)+/)?.[0] ?? ''
    const body = html.replace(/^(?:<link rel="preload"[^>]*\/>)+/, '')
    const serialized = JSON.stringify(state).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    const page = template.replace('</head>', `${hints}</head>`).replace('<div id="root"></div>', `<div id="root">${body}</div><script id="__QUERY_STATE__" type="application/json" data-path="${url}">${serialized}</script>`)
    const destination = url === '/' ? path.join(output, 'index.html') : path.join(output, url, 'index.html')
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, page)
  }
  console.log(`Pré-renderizadas ${fixtureIds().length + 1} páginas em ${output}`)
} finally {
  await vite.close()
}
