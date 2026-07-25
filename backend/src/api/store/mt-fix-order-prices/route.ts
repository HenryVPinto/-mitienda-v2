import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

type TierRule = { min_quantity: number; discount_percentage: number }

function toRaw(value: number) {
  return { value: `${value}.00000000000000000`, precision: 20 }
}

// POST /store/mt-fix-order-prices
// 1. Corrige unit_price en order_line_item si Medusa creó la orden con precio original
//    (cuando mt-apply-wholesale-prices no se aplicó antes de complete).
// 2. Sincroniza payment/payment_session/payment_collection al total real de la orden,
//    sin importar si el delta de items es 0 o no. Esto cubre el caso donde el payment
//    se creó con el precio original (antes de aplicar descuento de mayoreo).
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { order_id, cart_id } = req.body as { order_id?: string; cart_id?: string }
  if (!order_id) {
    return res.status(400).json({ message: "order_id es requerido" })
  }

  try {
    // ── 1. Leer line items de la orden con su metadata ──────────────────────
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

      await pool.query(
        `UPDATE order_line_item SET unit_price = $1, raw_unit_price = $2 WHERE id = $3`,
        [effectivePrice, JSON.stringify(toRaw(effectivePrice)), li.item_id]
      )

      itemsSubtotalDelta += (effectivePrice - originalPrice) * qty
      console.log(
        `[mt-fix-order-prices] item=${li.item_id} qty=${qty} ${originalPrice}→${effectivePrice} delta=${(effectivePrice - originalPrice) * qty}`
      )
    }

    // ── 2. Leer y actualizar order_summary ──────────────────────────────────
    const { rows: summaries } = await pool.query<{
      id: string
      totals: Record<string, unknown>
    }>(
      `SELECT id, totals FROM order_summary WHERE order_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [order_id]
    )

    let correctOrderTotal = 0

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
      const txTotal       = getRaw("transaction_total")

      // Aplicar delta a los totales (puede ser 0 si ya estaban bien)
      const newCurrent  = currentTotal + itemsSubtotalDelta
      const newOriginal = originalTotal + itemsSubtotalDelta
      const newPending  = newCurrent - txTotal

      correctOrderTotal = newCurrent

      if (itemsSubtotalDelta !== 0) {
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
      } else {
        console.log(
          `[mt-fix-order-prices] order=${order_id} items ya correctos, total correcto=${newCurrent}`
        )
      }
    }

    // ── 3. Sincronizar payment al total real de la orden ────────────────────
    // En Medusa v2, payment_collection se vincula al cart (cart_id), no a la orden.
    // Primero intentamos con cart_id (pasado desde checkout), como fallback leemos
    // el cart_id desde la tabla order.
    if (correctOrderTotal > 0) {
      let effectiveCartId = cart_id
      if (!effectiveCartId) {
        const { rows: orderRows } = await pool.query<{ cart_id: string | null }>(
          `SELECT cart_id FROM "order" WHERE id = $1 LIMIT 1`,
          [order_id]
        )
        effectiveCartId = orderRows[0]?.cart_id ?? undefined
        if (effectiveCartId) {
          console.log(`[mt-fix-order-prices] cart_id resuelto desde order: ${effectiveCartId}`)
        }
      }

      if (!effectiveCartId) {
        console.warn(`[mt-fix-order-prices] no se pudo obtener cart_id para order=${order_id}`)
      }

      const { rows: payments } = await pool.query<{
        payment_id: string
        payment_session_id: string | null
        payment_collection_id: string
        current_amount: string | number
      }>(
        effectiveCartId
          ? `SELECT p.id AS payment_id,
                    p.payment_session_id,
                    p.payment_collection_id,
                    p.amount AS current_amount
             FROM payment p
             JOIN payment_collection pc ON pc.id = p.payment_collection_id
             WHERE pc.cart_id = $1
               AND p.deleted_at IS NULL
               AND pc.deleted_at IS NULL`
          : `SELECT p.id AS payment_id,
                    p.payment_session_id,
                    p.payment_collection_id,
                    p.amount AS current_amount
             FROM payment p
             JOIN payment_collection pc ON pc.id = p.payment_collection_id
             JOIN order_payment_collection opc ON opc.payment_collection_id = pc.id
             WHERE opc.order_id = $1
               AND p.deleted_at IS NULL
               AND pc.deleted_at IS NULL`,
        [effectiveCartId ?? order_id]
      )

      for (const p of payments) {
        const currentAmount = Number(p.current_amount)
        if (currentAmount === correctOrderTotal) {
          console.log(
            `[mt-fix-order-prices] payment=${p.payment_id} ya está en ${currentAmount}, sin cambio`
          )
          continue
        }

        await pool.query(
          `UPDATE payment SET amount = $1, raw_amount = $2 WHERE id = $3`,
          [correctOrderTotal, JSON.stringify(toRaw(correctOrderTotal)), p.payment_id]
        )
        if (p.payment_session_id) {
          await pool.query(
            `UPDATE payment_session SET amount = $1, raw_amount = $2 WHERE id = $3`,
            [correctOrderTotal, JSON.stringify(toRaw(correctOrderTotal)), p.payment_session_id]
          )
        }
        await pool.query(
          `UPDATE payment_collection SET amount = $1, raw_amount = $2 WHERE id = $3`,
          [correctOrderTotal, JSON.stringify(toRaw(correctOrderTotal)), p.payment_collection_id]
        )

        console.log(
          `[mt-fix-order-prices] payment=${p.payment_id} ${currentAmount}→${correctOrderTotal}`
        )
      }

      if (payments.length === 0) {
        console.warn(`[mt-fix-order-prices] no se encontraron payments para order=${order_id}`)
      }
    }

    res.json({ updated: true, delta: itemsSubtotalDelta, correctOrderTotal })
  } catch (err) {
    console.error("[mt-fix-order-prices POST]", err)
    res.status(500).json({ message: "Error al corregir precios de la orden" })
  }
}
