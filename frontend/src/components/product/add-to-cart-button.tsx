"use client"

import { useState } from "react"
import { ShoppingCart, Minus, Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { formatGTQ } from "@/lib/format"
import type { PricingTier } from "@/lib/types"

type Props = {
  variantId: string
  basePrice: number
  disabled?: boolean
  tiers?: PricingTier[]
}

function getActiveTier(qty: number, tiers: PricingTier[]): PricingTier | null {
  // tiers están ordenados por min_quantity asc — tomamos el mayor que aplique
  return (
    [...tiers]
      .reverse()
      .find((t) => qty >= t.min_quantity) ?? null
  )
}

export function AddToCartButton({ variantId, basePrice, disabled, tiers = [] }: Props) {
  const { addItem, loading } = useCart()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  const activeTier = getActiveTier(qty, tiers)
  const unitPrice = activeTier
    ? Math.round(basePrice * (1 - activeTier.discount_percentage / 100))
    : basePrice
  const total = unitPrice * qty
  const savings = (basePrice - unitPrice) * qty

  // Siguiente tier para mostrar sugerencia
  const nextTier = tiers.find((t) => qty < t.min_quantity)

  async function handleAdd() {
    const metadata: Record<string, unknown> = {
      base_unit_price: basePrice,
    }
    if (tiers.length > 0) {
      metadata.tier_rules = tiers.map(({ min_quantity, discount_percentage }) => ({
        min_quantity,
        discount_percentage,
      }))
    }
    await addItem(variantId, qty, metadata)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="space-y-3">
      {/* Selector de cantidad */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600 font-medium">Cantidad:</label>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="px-3 py-2 hover:bg-gray-50 text-gray-600 disabled:opacity-40"
            disabled={qty <= 1}
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="px-4 py-2 text-sm font-medium min-w-[3rem] text-center">{qty}</span>
          <button
            onClick={() => setQty((q) => q + 1)}
            className="px-3 py-2 hover:bg-gray-50 text-gray-600"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Precio dinámico por unidad */}
        <div className="text-sm">
          {activeTier ? (
            <span className="text-[var(--color-brand-orange)] font-bold">
              {formatGTQ(unitPrice)}<span className="text-gray-400 font-normal">/u</span>
            </span>
          ) : (
            <span className="text-gray-500">{formatGTQ(basePrice)}<span className="text-gray-400">/u</span></span>
          )}
        </div>
      </div>

      {/* Badge de descuento activo */}
      {activeTier && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm">
          <Tag className="w-4 h-4 text-green-600 flex-shrink-0" />
          <span className="text-green-700">
            <strong>{activeTier.discount_percentage}% OFF</strong> — {activeTier.name}
            {" · "}Total: <strong>{formatGTQ(total)}</strong>
            {" · "}Ahorras: <strong>{formatGTQ(savings)}</strong>
          </span>
        </div>
      )}

      {/* Sugerencia del siguiente tier */}
      {!activeTier && nextTier && (
        <p className="text-xs text-primary">
          💡 Compra {nextTier.min_quantity}+ unidades y obtén{" "}
          <strong>{nextTier.discount_percentage}% de descuento</strong> ({nextTier.name})
        </p>
      )}
      {activeTier && nextTier && (
        <p className="text-xs text-primary">
          💡 Compra {nextTier.min_quantity}+ unidades para obtener{" "}
          <strong>{nextTier.discount_percentage}% de descuento</strong> ({nextTier.name})
        </p>
      )}

      <Button
        onClick={handleAdd}
        disabled={disabled || loading}
        className="w-full h-12 text-base bg-primary hover:bg-primary/90 font-semibold gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        {added
          ? "¡Agregado!"
          : `Agregar al carrito · ${formatGTQ(total)}`}
      </Button>
    </div>
  )
}
