// a tela pinta antes do service worker do msw; só as chamadas de api esperam ele assumir
let ready: Promise<unknown> = Promise.resolve()

export function setMocksReady(promise: Promise<unknown>) {
  ready = promise
}

export function whenMocksReady() {
  return ready
}
