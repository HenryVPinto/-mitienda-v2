import { storeGet, storePost, storeDelete } from "./medusa"
import type { Cart } from "./types"

const CART_KEY = "mt_cart_id"
const PRODUCT_FIELDS =
  "id,completed_at,items,items.id,items.title,items.thumbnail,items.variant_id,items.variant.id,items.variant.title,items.variant.product.id,items.variant.product.handle,items.variant.product.title,items.variant.product.thumbnail,items.variant.product.images.*,items.quantity,items.unit_price,items.total,items.metadata,total,subtotal,discount_total,shipping_total,tax_total,region_id,email,shipping_address,promotions.id,promotions.code,promotions.is_automatic"

export function getStoredCartId(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(CART_KEY)
}

export function setStoredCartId(id: string) {
  localStorage.setItem(CART_KEY, id)
}

export function clearStoredCartId() {
  localStorage.removeItem(CART_KEY)
}

export async function getOrCreateCart(): Promise<Cart> {
  const cartId = getStoredCartId()
  if (cartId) {
    try {
      const data = await storeGet<{ cart: Cart }>(
        `/store/carts/${cartId}`,
        { fields: PRODUCT_FIELDS },
        { cache: "no-store" }
      )
      if (!data.cart.completed_at) return data.cart
      clearStoredCartId()
    } catch {
      clearStoredCartId()
    }
  }

  const regionsData = await storeGet<{ regions: { id: string }[] }>("/store/regions")
  const regionId = regionsData.regions[0]?.id

  const data = await storePost<{ cart: Cart }>("/store/carts", {
    region_id: regionId,
  })
  setStoredCartId(data.cart.id)
  return data.cart
}

export async function addToCart(
  variantId: string,
  quantity: number,
  metadata?: Record<string, unknown>
): Promise<Cart> {
  const cart = await getOrCreateCart()
  const body: Record<string, unknown> = { variant_id: variantId, quantity }
  if (metadata) body.metadata = metadata
  const data = await storePost<{ cart: Cart }>(
    `/store/carts/${cart.id}/line-items`,
    body,
    { fields: PRODUCT_FIELDS }
  )
  return data.cart
}

export async function updateCartItem(
  cartId: string,
  lineItemId: string,
  quantity: number
): Promise<Cart> {
  const data = await storePost<{ cart: Cart }>(
    `/store/carts/${cartId}/line-items/${lineItemId}`,
    { quantity },
    { fields: PRODUCT_FIELDS }
  )
  return data.cart
}

export async function removeCartItem(
  cartId: string,
  lineItemId: string
): Promise<Cart> {
  await storeDelete(`/store/carts/${cartId}/line-items/${lineItemId}`)
  const data = await storeGet<{ cart: Cart }>(
    `/store/carts/${cartId}`,
    { fields: PRODUCT_FIELDS },
    { cache: "no-store" }
  )
  return data.cart
}

export async function applyPromoCode(
  cartId: string,
  code: string
): Promise<Cart> {
  const data = await storePost<{ cart: Cart }>(
    `/store/carts/${cartId}/promotions`,
    { promo_codes: [code.trim().toUpperCase()] },
    { fields: PRODUCT_FIELDS }
  )
  return data.cart
}

export async function removePromoCode(
  cartId: string,
  code: string
): Promise<Cart> {
  await storeDelete(`/store/carts/${cartId}/promotions/${code}`)
  const data = await storeGet<{ cart: Cart }>(
    `/store/carts/${cartId}`,
    { fields: PRODUCT_FIELDS },
    { cache: "no-store" }
  )
  return data.cart
}
