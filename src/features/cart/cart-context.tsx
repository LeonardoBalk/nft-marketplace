import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { z } from 'zod'

const storageKey = 'kurio.cart.v1'
const cartItemSchema = z.object({ nftId: z.string(), quantity: z.number().int().positive() })
const cartSchema = z.array(cartItemSchema)
type CartItem = z.infer<typeof cartItemSchema>

interface CartContextValue {
  itemCount: number
  addItem: (nftId: string, maxQuantity: number) => void
}

const CartContext = createContext<CartContextValue | null>(null)

function readCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(storageKey)
    if (!stored) return []
    const parsed = cartSchema.safeParse(JSON.parse(stored))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items))
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [items])

  const addItem = useCallback((nftId: string, maxQuantity: number) => {
    setItems((current) => {
      const existing = current.find((item) => item.nftId === nftId)
      if (existing) {
        if (existing.quantity >= maxQuantity) return current
        return current.map((item) => item.nftId === nftId ? { ...item, quantity: item.quantity + 1 } : item)
      }
      return maxQuantity > 0 ? [...current, { nftId, quantity: 1 }] : current
    })
  }, [])

  const value = useMemo(() => ({
    itemCount: items.reduce((total, item) => total + item.quantity, 0),
    addItem,
  }), [items, addItem])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart deve ser usado dentro de CartProvider.')
  return context
}
