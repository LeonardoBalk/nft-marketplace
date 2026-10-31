import { z } from 'zod'
import type { AuthUser } from '../features/auth/contracts'
import type { FavoritesResponse } from '../features/favorites/contracts'

const storeKey = 'kurio.demo.favorites.v1'
const storeSchema = z.record(z.string(), z.array(z.string()))
type FavoritesStore = z.infer<typeof storeSchema>

function loadStore(): FavoritesStore {
  try {
    const raw = localStorage.getItem(storeKey)
    const parsed = raw ? storeSchema.safeParse(JSON.parse(raw)) : null
    if (parsed?.success) return parsed.data
  } catch {
    return {}
  }
  return {}
}

function saveStore(store: FavoritesStore): void {
  localStorage.setItem(storeKey, JSON.stringify(store))
}

export function readFavorites(user: AuthUser): FavoritesResponse {
  return { nftIds: loadStore()[user.id] ?? [] }
}

// favorito é por usuário: trocar de conta não pode herdar a lista da anterior
export function addFavorite(user: AuthUser, nftId: string): FavoritesResponse {
  const store = loadStore()
  const current = store[user.id] ?? []
  store[user.id] = current.includes(nftId) ? current : [...current, nftId]
  saveStore(store)
  return { nftIds: store[user.id] }
}

export function removeFavorite(user: AuthUser, nftId: string): FavoritesResponse {
  const store = loadStore()
  store[user.id] = (store[user.id] ?? []).filter((entry) => entry !== nftId)
  saveStore(store)
  return { nftIds: store[user.id] }
}
