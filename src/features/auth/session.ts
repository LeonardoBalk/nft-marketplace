const tokenStorageKey = 'kurio.demo.access-token.v1'
const guestStorageKey = 'kurio.demo.guest-id.v1'

export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(tokenStorageKey)
  } catch {
    return null
  }
}

export function setAccessToken(token: string): void {
  try {
    localStorage.setItem(tokenStorageKey, token)
  } catch {
    // keep the active session
  }
}

export function clearAccessToken(): void {
  try {
    localStorage.removeItem(tokenStorageKey)
  } catch {
    // finish logout without storage
  }
}

export function rotateGuestId(): void {
  try {
    localStorage.setItem(guestStorageKey, crypto.randomUUID())
  } catch {
    // seguir com a identidade atual
  }
}

export function getGuestId(): string {
  try {
    const existing = localStorage.getItem(guestStorageKey)
    if (existing) return existing
    const guestId = crypto.randomUUID()
    localStorage.setItem(guestStorageKey, guestId)
    return guestId
  } catch {
    return 'temporary-guest'
  }
}
