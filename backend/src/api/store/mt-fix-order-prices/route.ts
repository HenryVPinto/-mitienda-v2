import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

type TierRule = { min_quantity: number; discount_percentage: number }

function toRaw(value: number) {
  return { value: `${value}.00000000000000000`, precision: 20 }
}

// POST /store/mt-fix-order-prices
// Corrige unit_price en order_line_item y totales en order_summary
// después de que Medusa crea la orden, para reflejar descuentos de mayoreo.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id } = req.body as { order_id?: string }
  if (!order_id) {
    return res.status(400).json({ message: "order_id es requerido" })
  }

  try {
    // 1. Leer line items de la orden con su metadata
    const { rows: lineItems } = await pool.query<{
      item_id: string
      unit_price: string | number
      quantity: string | number
      metadata: { base_unit_price?: number; tier_rules?: TierRule[] } | null
    }>(
      `SELECT oli.id AS item_id, oli.unit_price, oi.quantity, oli.metadata
       FROM order_item oi
       JOIN order_line_item oli ON oli.id = oi.item_id
       WHERE oi.order_id = $1 AND oi.deleted_at IS NULL AND oli.deleted_at IS NULL`,
      [order_id]
    )

    let itemsSubtotalDelta = 0

    for (const li of lineItems) {
      const tiers: TierRule[] = li.metadata?.tier_rules ?? []
      if (tiers.length === 0) continue

      const qty = Number(li.quantity) || 0
      const basePrice = li.metadata?.base_unit_price ?? Number(li.unit_price)

      const activeTier = [...tiers]
        .sort((a, b) => a.min_quantity - b.min_quantity)
        .reverse()
        .find((t) => qty >= t.min_quantity)

      if (!activeTier) continue

      const effectivePrice = Math.round(basePrice * (1 - activeTier.discount_percentage / 100))
      const originalPrice = Number(li.unit_price)

      if (effectivePrice === originalPrice) continue

      // Actualizar order_line_item
      await pool.query(
        `UPDATE order_line_item
         SET unit_price = $1, raw_unit_price = $2
         WHERE id = $3`,
        [effectivePrice, JSON.stringify(toRaw(effectivePrice)), li.item_id]
      )

      itemsSubtotalDelta += (effectivePrice - originalPrice) * qty
      console.log(
        `[mt-fix-order-prices] item=${li.item_id} qty=${qty} ${originalPrice}→${effectivePrice} delta=${(effectivePrice - originalPrice) * qty}`
      )
    }

    if (itemsSubtotalDelta === 0) {
      return res.json({ updated: false, message: "No se requirió corrección de precios" })
    }

    // 2. Actualizar order_summary.totals con el nuevo total
    const { rows: summaries } = await pool.query<{
      id: string
      totals: Record<string, unknown>
    }>(
      `SELECT id, totals FROM order_summary WHERE order_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [order_id]
    )

    if (summaries.length > 0) {
      const summary = summaries[0]
      const totals = summary.totals as Record<string, { value?: string } | number>

      function getRaw(field: string): number {
        const v = totals[field]
        if (typeof v === "object" && v !== null && "value" in v) return Number(v.value)
        if (typeof v === "number") return v
        return 0
      }

      const currentTotal  = getRaw("current_order_total")
      const originalTotal = getRaw("original_order_total")
      const newCurrent    = currentTotal + itemsSubtotalDelta
      const newOriginal   = originalTotal + itemsSubtotalDelta
      const txTotal       = getRaw("transaction_total")
      const newPending    = newCurrent - txTotal

      const newTotals = {
        ...totals,
        current_order_total:  toRaw(newCurrent),
        original_order_total: toRaw(newOriginal),
        accounting_total:     toRaw(newCurrent),
        pending_difference:   toRaw(newPending),
      }

      await pool.query(
        `UPDATE order_summary SET totals = $1 WHERE id = $2`,
        [JSON.stringify(newTotals), summary.id]
      )

      console.log(
        `[mt-fix-order-prices] order=${order_id} total ${currentTotal}→${newCurrent} (delta=${itemsSubtotalDelta})`
      )
    }

    res.json({ updated: true, delta: itemsSubtotalDelta })
  } catch (err) {
    console.error("[mt-fix-order-prices POST]", err)
    res.status(500).json({ message: "Error al corregir precios de la orden" })
  }
}
