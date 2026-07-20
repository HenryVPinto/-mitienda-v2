import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /store/mt-shipping-options?cart_id=...
// Devuelve las reglas de envío activas con precios calculados y los IDs nativos de Medusa
// (necesarios para POST /store/carts/:id/shipping-methods)
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart_id = req.query.cart_id as string | undefined
  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    // Calcular total del carrito sumando los line items (subtotal no es columna en Medusa v2)
    const { rows: itemRows } = await pool.query(
      `SELECT COALESCE(unit_price, 0) AS unit_price, COALESCE(quantity, 0) AS quantity
       FROM cart_line_item
       WHERE cart_id = $1 AND deleted_at IS NULL`,
      [cart_id]
    )
    const cartTotal = itemRows.reduce(
      (sum: number, r: { unit_price: string | number; quantity: string | number }) =>
        sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0),
      0
    )

    // Obtener las shipping_options de Medusa creadas con nuestro provider
    // data->>'id' contiene el ID de la regla (proveniente de getFulfillmentOptions)
    const { rows: nativeOptions } = await pool.query(`
      SELECT so.id AS medusa_option_id,
             so.data->>'id' AS rule_id
      FROM   shipping_option so
      WHERE  so.provider_id LIKE '%mt-fulfillment%'
        AND  so.deleted_at IS NULL
    `)

    const ruleToMedusaId = new Map<string, string>(
      nativeOptions
        .filter((r: { rule_id: string | null; medusa_option_id: string }) => r.rule_id)
        .map((r: { rule_id: string; medusa_option_id: string }) => [r.rule_id, r.medusa_option_id])
    )

    // Reglas activas aplicables al total del carrito
    const { rows: rules } = await pool.query(
      `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount
       FROM   mt_shipping_rule
       WHERE  is_active = true AND deleted_at IS NULL
         AND  (min_order_amount IS NULL OR min_order_amount <= $1)
         AND  (max_order_amount IS NULL OR max_order_amount >= $1)
       ORDER BY priority DESC`,
      [cartTotal]
    )

    const shipping_options = rules
      .map((rule: {
        id: string; name: string; flat_rate: number | null;
        free_above_amount: number | null
      }) => {
        const medusaId = ruleToMedusaId.get(rule.id)
        if (!medusaId) return null

        const isFree = rule.free_above_amount != null && cartTotal >= rule.free_above_amount
        // flat_rate está en centavos en la DB; dividir entre 100 para devolver quetzales
        const amount = isFree ? 0 : ((rule.flat_rate ?? 0) / 100)

        return { id: medusaId, rule_id: rule.id, name: rule.name, amount, provider_id: "mt-fulfillment" }
      })
      .filter(Boolean)

    res.json({
      shipping_options,
      needs_setup: nativeOptions.length === 0,
    })
  } catch (err) {
    console.error("[mt-shipping-options GET]", err)
    res.status(500).json({ message: "Error al obtener las opciones de envío" })
  }
}
