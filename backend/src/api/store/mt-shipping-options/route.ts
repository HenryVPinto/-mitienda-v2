import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /store/mt-shipping-options?cart_id=...
// Evalúa las reglas de envío activas y devuelve la tarifa correcta:
//   - Tarifa fija base (flat_rate, en centavos DB)
//   - Gratis si el total supera free_above_amount (en centavos DB)
//   - Excepción por peso en mayoreo: si peso total > weight_threshold_lbs,
//     se cobra rate_per_lb × libras_sobre_umbral (rate_per_lb en quetzales DB)
//   - Reglas de mayoreo solo aplican si cantidad de items >= min_item_quantity
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart_id = req.query.cart_id as string | undefined
  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    // Items del carrito: precio (centavos), cantidad, peso del variant (gramos)
    const { rows: itemRows } = await pool.query(
      `SELECT
         COALESCE(cli.unit_price, 0)    AS unit_price,
         COALESCE(cli.quantity,   0)    AS quantity,
         COALESCE(pv.weight,      0)    AS weight_grams
       FROM  cart_line_item cli
       LEFT JOIN product_variant pv ON pv.id = cli.variant_id
       WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL`,
      [cart_id]
    )

    type ItemRow = { unit_price: string | number; quantity: string | number; weight_grams: string | number }

    // Total en centavos
    const cartTotal = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0),
      0
    )

    // Cantidad total de ítems (para detectar mayoreo)
    const totalItems = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.quantity) || 0),
      0
    )

    // Peso total en libras (Medusa guarda weight en gramos; 1 lb = 453.592 g)
    const totalWeightLbs = itemRows.reduce(
      (sum: number, r: ItemRow) => {
        const grams = (Number(r.weight_grams) || 0) * (Number(r.quantity) || 1)
        return sum + grams / 453.592
      },
      0
    )

    // Shipping options nativas de Medusa para nuestro provider
    const { rows: nativeOptions } = await pool.query(`
      SELECT so.id AS medusa_option_id,
             so.data->>'id' AS rule_id
      FROM   shipping_option so
      WHERE  so.provider_id LIKE '%mt-fulfillment%'
        AND  so.deleted_at IS NULL
    `)

    const ruleToMedusaId = new Map<string, string>(
      nativeOptions
        .filter((r: { rule_id: string | null }) => r.rule_id)
        .map((r: { rule_id: string; medusa_option_id: string }) => [r.rule_id, r.medusa_option_id])
    )

    // Reglas activas, filtradas por min/max_order_amount, ordenadas por prioridad
    const { rows: rules } = await pool.query(
      `SELECT id, name, flat_rate, free_above_amount,
              weight_threshold_lbs, rate_per_lb, min_item_quantity,
              min_order_amount, max_order_amount
       FROM   mt_shipping_rule
       WHERE  is_active = true AND deleted_at IS NULL
         AND  (min_order_amount IS NULL OR min_order_amount <= $1)
         AND  (max_order_amount IS NULL OR max_order_amount >= $1)
       ORDER BY priority DESC`,
      [cartTotal]
    )

    type RuleRow = {
      id: string
      name: string
      flat_rate: number | null
      free_above_amount: number | null
      weight_threshold_lbs: number | null
      rate_per_lb: number | null
      min_item_quantity: number | null
    }

    const shipping_options = rules
      .map((rule: RuleRow) => {
        const medusaId = ruleToMedusaId.get(rule.id)
        if (!medusaId) return null

        // Reglas de mayoreo solo aplican si hay suficientes ítems
        if (rule.min_item_quantity !== null && rule.min_item_quantity > 1 && totalItems < rule.min_item_quantity) {
          return null
        }

        // ¿Aplica envío gratis? free_above_amount en centavos DB; cartTotal en quetzales
        const qualifiesFree = rule.free_above_amount != null && cartTotal >= rule.free_above_amount / 100

        // ¿Aplica excepción por peso? (peso total supera el umbral)
        const hasWeightException =
          rule.weight_threshold_lbs != null &&
          rule.rate_per_lb != null &&
          totalWeightLbs > rule.weight_threshold_lbs

        let amount: number

        if (hasWeightException) {
          // Cobrar por libras sobre el umbral — rate_per_lb se guarda en quetzales
          const extraLbs = totalWeightLbs - (rule.weight_threshold_lbs ?? 0)
          amount = (rule.rate_per_lb ?? 0) * extraLbs
          // Redondear a 2 decimales
          amount = Math.round(amount * 100) / 100
        } else if (qualifiesFree) {
          amount = 0
        } else {
          // flat_rate en centavos → quetzales
          amount = (rule.flat_rate ?? 0) / 100
        }

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
