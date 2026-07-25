import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function toRaw(value: number) {
  return { value: `${value}.00000000000000000`, precision: 20 }
}

// POST /store/mt-fix-payment-collection
// Medusa calcula el monto del payment_collection desde su caché interno, que NO
// refleja los cambios directos de mt-apply-wholesale-prices en cart_line_item.
// Este endpoint lee el total real desde la DB y actualiza payment_collection +
// payment_session para que coincidan con los precios de mayoreo.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id, payment_collection_id } = req.body as {
    cart_id?: string
    payment_collection_id?: string
  }

  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    // Total real de items desde cart_line_item (ya actualizado por mt-apply-wholesale-prices)
    const { rows: itemRows } = await pool.query<{ subtotal: string }>(
      `SELECT COALESCE(SUM(unit_price * quantity), 0)::text AS subtotal
       FROM cart_line_item
       WHERE cart_id = $1 AND deleted_at IS NULL`,
      [cart_id]
    )
    const itemsSubtotal = Number(itemRows[0]?.subtotal) || 0

    // Costo de envío aplicado al carrito
    const { rows: shippingRows } = await pool.query<{ shipping_total: string }>(
      `SELECT COALESCE(SUM(amount), 0)::text AS shipping_total
       FROM cart_shipping_method
       WHERE cart_id = $1 AND deleted_at IS NULL`,
      [cart_id]
    )
    const shippingTotal = Number(shippingRows[0]?.shipping_total) || 0

    const correctTotal = itemsSubtotal + shippingTotal

    console.log(
      `[mt-fix-payment-collection] cart=${cart_id} items=${itemsSubtotal} shipping=${shippingTotal} total=${correctTotal}`
    )

    if (correctTotal <= 0) {
      return res.json({ updated: false, reason: "total calculado es 0" })
    }

    // Resolver payment_collection_id si no se pasó
    let pcId = payment_collection_id
    if (!pcId) {
      const { rows: pcRows } = await pool.query<{ id: string }>(
        `SELECT id FROM payment_collection WHERE cart_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [cart_id]
      )
      pcId = pcRows[0]?.id
    }

    if (!pcId) {
      console.warn(`[mt-fix-payment-collection] no se encontró payment_collection para cart=${cart_id}`)
      return res.json({ updated: false, reason: "payment_collection no encontrada" })
    }

    // Actualizar payment_collection
    const { rowCount: pcCount } = await pool.query(
      `UPDATE payment_collection SET amount = $1, raw_amount = $2 WHERE id = $3 AND deleted_at IS NULL`,
      [correctTotal, JSON.stringify(toRaw(correctTotal)), pcId]
    )
    console.log(`[mt-fix-payment-collection] payment_collection=${pcId} updated=${pcCount} → ${correctTotal}`)

    // Actualizar payment_session(s) asociadas
    const { rowCount: psCount } = await pool.query(
      `UPDATE payment_session SET amount = $1, raw_amount = $2
       WHERE payment_collection_id = $3 AND deleted_at IS NULL`,
      [correctTotal, JSON.stringify(toRaw(correctTotal)), pcId]
    )
    console.log(`[mt-fix-payment-collection] payment_sessions updated=${psCount}`)

    res.json({ updated: true, correctTotal, itemsSubtotal, shippingTotal })
  } catch (err) {
    console.error("[mt-fix-payment-collection POST]", err)
    res.status(500).json({ message: "Error al corregir payment collection" })
  }
}
