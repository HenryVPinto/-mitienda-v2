import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

type TierRule = { min_quantity: number; discount_percentage: number }
type ItemRow = {
  id: string
  unit_price: string | number
  quantity: string | number
  metadata: { base_unit_price?: number; tier_rules?: TierRule[] } | null
}

// POST /store/mt-apply-wholesale-prices
// Aplica el precio de mayoreo (tier_rules) a unit_price en cart_line_item
// antes de que Medusa complete el carrito y guarde la orden.
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { cart_id } = req.body as { cart_id?: string }
  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    const { rows: items } = await pool.query<ItemRow>(
      `SELECT id, unit_price, quantity, metadata
       FROM cart_line_item
       WHERE cart_id = $1 AND deleted_at IS NULL`,
      [cart_id]
    )

    let updated = 0

    for (const item of items) {
      const meta = item.metadata
      const tiers: TierRule[] = meta?.tier_rules ?? []
      if (tiers.length === 0) continue

      const qty = Number(item.quantity) || 0
      const basePrice = meta?.base_unit_price ?? Number(item.unit_price)

      // Tier más alto que aplica
      const activeTier = [...tiers]
        .sort((a, b) => a.min_quantity - b.min_quantity)
        .reverse()
        .find((t) => qty >= t.min_quantity)

      if (!activeTier) continue

      const effectivePrice = Math.round(basePrice * (1 - activeTier.discount_percentage / 100))

      if (effectivePrice === Number(item.unit_price)) continue

      await pool.query(
        `UPDATE cart_line_item SET unit_price = $1 WHERE id = $2`,
        [effectivePrice, item.id]
      )
      updated++
      console.log(
        `[mt-apply-wholesale-prices] item=${item.id} qty=${qty} base=${basePrice} tier=${activeTier.discount_percentage}% → ${effectivePrice}`
      )
    }

    res.json({ updated })
  } catch (err) {
    console.error("[mt-apply-wholesale-prices POST]", err)
    res.status(500).json({ message: "Error al aplicar precios de mayoreo" })
  }
}
