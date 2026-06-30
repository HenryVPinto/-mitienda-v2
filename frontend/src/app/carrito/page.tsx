"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart, Minus, Plus, X, Tag } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { formatGTQ } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"
import { storePost } from "@/lib/medusa"
import type { LineItem, PromotionsEvaluateResponse } from "@/lib/types"

type TierRule = { min_quantity: number; discount_percentage: number }

function getEffectiveUnitPrice(item: LineItem): number {
  const meta = item.metadata as { base_unit_price?: number; tier_rules?: TierRule[] } | null
  const base = meta?.base_unit_price ?? item.unit_price
  const rules = meta?.tier_rules
  if (!rules?.length) return base
  const activeTier = [...rules]
    .sort((a, b) => a.min_quantity - b.min_quantity)
    .reverse()
    .find((t) => item.quantity >= t.min_quantity)
  if (!activeTier) return base
  return Math.round(base * (1 - activeTier.discount_percentage / 100))
}

export default function CartPage() {
  const { items, total, subtotal, updateItem, removeItem, loading } = useCart()
  const [promos, setPromos] = useState<PromotionsEvaluateResponse | null>(null)

  useEffect(() => {
    if (!items.length) {
      setPromos(null)
      return
    }
    const cartItems = items.map((i) => ({
      product_id: i.variant?.product?.id,
      quantity: i.quantity,
      unit_price: i.unit_price,
    }))
    storePost<PromotionsEvaluateResponse>("/store/promotions/evaluate", { items: cartItems })
      .then(setPromos)
      .catch(() => setPromos(null))
  }, [items])

  if (!items.length) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Tu carrito está vacío</h1>
        <p className="text-gray-500 text-sm mb-6">Agrega productos para continuar.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90")}>
          Explorar productos
        </Link>
      </div>
    )
  }

  const effectiveTotal = items.reduce((sum, item) => sum + getEffectiveUnitPrice(item) * item.quantity, 0)
  const baseTotal = items.reduce((sum, item) => {
    const meta = item.metadata as { base_unit_price?: number } | null
    return sum + (meta?.base_unit_price ?? item.unit_price) * item.quantity
  }, 0)
  const tierSavings = baseTotal - effectiveTotal

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6" />
        Mi carrito
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de ítems */}
        <div className="lg:col-span-2 space-y-3">
          {items.map((item) => {
            const effectivePrice = getEffectiveUnitPrice(item)
            const meta = item.metadata as { base_unit_price?: number } | null
            const basePrice = meta?.base_unit_price ?? item.unit_price
            const hasDiscount = effectivePrice < basePrice
            const imageUrl = item.thumbnail
              ?? item.variant?.product?.thumbnail
              ?? item.variant?.product?.images?.[0]?.url
              ?? null
            return (
              <div key={item.id} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden relative">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={item.title}
                      fill
                      className="object-contain p-1"
                      sizes="80px"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/producto/${item.variant?.product?.handle ?? ""}`}
                    className="text-sm font-semibold text-gray-800 hover:text-primary line-clamp-2"
                  >
                    {item.title}
                  </Link>
                  {item.variant?.title && item.variant.title !== "Default Title" && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.variant.title}</p>
                  )}
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-base font-bold text-[var(--color-brand-orange)]">
                      {formatGTQ(effectivePrice)}
                    </p>
                    {hasDiscount && (
                      <p className="text-xs text-gray-400 line-through">{formatGTQ(basePrice)}</p>
                    )}
                    <span className="text-xs text-gray-400">/u</span>
                  </div>
                  {hasDiscount && (
                    <p className="text-xs text-green-600 font-medium flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" />
                      Precio mayoreo
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={loading}
                    className="text-gray-400 hover:text-red-500 disabled:opacity-40"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => updateItem(item.id, item.quantity - 1)}
                      disabled={loading || item.quantity <= 1}
                      className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-3 text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateItem(item.id, item.quantity + 1)}
                      disabled={loading}
                      className="px-2 py-1 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatGTQ(effectivePrice * item.quantity)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Resumen */}
        <div className="space-y-4">
          {/* Promociones no-tier (COMBO, GIFT, etc.) */}
          {promos && promos.applicable_promotions.filter(p => p.type !== "QUANTITY_DISCOUNT").length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Promociones aplicadas
              </h3>
              <ul className="space-y-1">
                {promos.applicable_promotions.filter(p => p.type !== "QUANTITY_DISCOUNT").map((p) => (
                  <li key={p.rule_id} className="text-xs text-orange-600">
                    ✓ {p.rule_name}
                    {p.savings > 0 && ` — Ahorras ${formatGTQ(p.savings)}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Totales */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <h2 className="font-bold text-gray-800">Resumen del pedido</h2>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatGTQ(baseTotal || subtotal || total)}</span>
              </div>
              {tierSavings > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Desc. volumen</span>
                  <span>−{formatGTQ(tierSavings)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="text-green-600">A calcular</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total estimado</span>
              <span className="text-[var(--color-brand-orange)]">{formatGTQ(effectiveTotal)}</span>
            </div>
            <Link
              href="/checkout"
              className={cn(buttonVariants({ variant: "default" }), "w-full bg-primary hover:bg-primary/90 h-11 font-semibold")}
            >
              Ir al Checkout →
            </Link>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Seguir comprando
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
