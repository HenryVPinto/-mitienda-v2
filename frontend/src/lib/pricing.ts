import type { LineItem } from "@/lib/types"

type TierRule = { min_quantity: number; discount_percentage: number }

export function getEffectiveUnitPrice(item: LineItem): number {
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

export function getEffectiveCartTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + getEffectiveUnitPrice(item) * item.quantity, 0)
}
