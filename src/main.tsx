import './styles.css'
import { setMocksReady } from './shared/api/mocks-ready'

// entrada mínima: o msw e o app baixam em paralelo, em vez de o msw esperar o app inteiro
function start() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    setMocksReady(import('./mocks/browser').then(({ worker }) => worker.start({ onUnhandledRequest: 'error' })).then(() => {
      document.documentElement.dataset.mocksReady = 'true'
    }))
  }
  void import('./app/boot')
}
// pintar o html pré-renderizado antes de iniciar react e msw
let started = false
const startOnce = () => {
  if (started) return
  started = true
  start()
}
requestAnimationFrame(() => window.setTimeout(startOnce, 100))
// iniciar também quando a aba em segundo plano pausar a animação
if (document.hidden) window.setTimeout(startOnce, 1000)
