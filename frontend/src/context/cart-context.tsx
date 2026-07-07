"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react"
import type { Cart, CartPromotion, LineItem } from "@/lib/types"
import {
  getOrCreateCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  applyPromoCode as applyPromoCodeLib,
  removePromoCode as removePromoCodeLib,
  getStoredCartId,
  clearStoredCartId,
} from "@/lib/cart"

type CartContextType = {
  cartId: string | null
  items: LineItem[]
  total: number
  subtotal: number
  discountTotal: number
  count: number
  loading: boolean
  promotions: CartPromotion[]
  addItem: (variantId: string, quantity: number, metadata?: Record<string, unknown>) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  updateItem: (lineItemId: string, quantity: number) => Promise<void>
  applyPromoCode: (code: string) => Promise<void>
  removePromoCode: (code: string) => Promise<void>
  clearCart: () => void
  refreshCart: () => Promise<void>
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshCart = useCallback(async () => {
    setLoading(true)
    try {
      const c = await getOrCreateCart()
      setCart(c)
    } catch {
      // silently fail — cart will stay null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshCart()
  }, [refreshCart])

  const addItem = useCallback(
    async (variantId: string, quantity: number, metadata?: Record<string, unknown>) => {
      setLoading(true)
      try {
        const c = await addToCart(variantId, quantity, metadata)
        setCart(c)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const removeItem = useCallback(
    async (lineItemId: string) => {
      if (!cart) return
      setLoading(true)
      try {
        const c = await removeCartItem(cart.id, lineItemId)
        setCart(c)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const updateItem = useCallback(
    async (lineItemId: string, quantity: number) => {
      if (!cart) return
      setLoading(true)
      try {
        const c = await updateCartItem(cart.id, lineItemId, quantity)
        setCart(c)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const applyPromoCode = useCallback(
    async (code: string) => {
      if (!cart) return
      setLoading(true)
      try {
        const c = await applyPromoCodeLib(cart.id, code)
        setCart(c)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const removePromoCode = useCallback(
    async (code: string) => {
      if (!cart) return
      setLoading(true)
      try {
        const c = await removePromoCodeLib(cart.id, code)
        setCart(c)
      } finally {
        setLoading(false)
      }
    },
    [cart]
  )

  const clearCart = useCallback(() => {
    clearStoredCartId()
    setCart(null)
  }, [])

  const items = cart?.items ?? []
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        cartId: cart?.id ?? getStoredCartId(),
        items,
        total: cart?.total ?? 0,
        subtotal: cart?.subtotal ?? 0,
        discountTotal: cart?.discount_total ?? 0,
        count,
        loading,
        promotions: cart?.promotions ?? [],
        addItem,
        removeItem,
        updateItem,
        applyPromoCode,
        removePromoCode,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
