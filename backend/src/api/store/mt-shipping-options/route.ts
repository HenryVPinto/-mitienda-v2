import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const TO_LBS: Record<string, number> = {
  lb: 1, lbs: 1, g: 1 / 453.592, kg: 2.20462, oz: 0.0625,
}

// GET /store/mt-shipping-options?cart_id=...
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart_id = req.query.cart_id as string | undefined
  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    // Items del carrito con peso del variant y metadata del producto (para weight_unit)
    const { rows: itemRows } = await pool.query(
      `SELECT
         COALESCE(cli.unit_price, 0)    AS unit_price,
         COALESCE(cli.quantity,   0)    AS quantity,
         COALESCE(pv.weight,      0)    AS weight_raw,
         cli.variant_id,
         p.metadata                     AS product_metadata
       FROM  cart_line_item cli
       LEFT JOIN product_variant pv ON pv.id = cli.variant_id
       LEFT JOIN product p ON p.id = pv.product_id
       WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL`,
      [cart_id]
    )

    type ItemRow = {
      unit_price: string | number
      quantity: string | number
      weight_raw: string | number
      variant_id: string | null
      product_metadata: Record<string, unknown> | null
    }

    // Total en quetzales (unit_price está en quetzales en esta instancia)
    const cartTotal = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0),
      0
    )

    // Cantidad total de ítems (para detectar mayoreo por cantidad)
    const totalItems = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.quantity) || 0),
      0
    )

    // Peso total en libras, respetando weight_unit del producto (igual que calculatePrice)
    for (const r of itemRows) {
      if (!Number(r.weight_raw)) {
        console.warn(`[mt-shipping] variant ${r.variant_id ?? "?"} tiene peso 0 o null — no contribuye al cálculo de envío por peso`)
      }
    }

    const totalWeightLbs = itemRows.reduce(
      (sum: number, r: ItemRow) => {
        const weightUnit = (r.product_metadata?.weight_unit as string) ?? "g"
        const factor = TO_LBS[weightUnit] ?? TO_LBS["g"]
        return sum + (Number(r.weight_raw) || 0) * factor * (Number(r.quantity) || 0)
      },
      0
    )

    console.info(`[mt-shipping] cart=${cart_id} items=${totalItems} totalWeightLbs=${totalWeightLbs.toFixed(4)} cartTotal=${cartTotal}`)

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

    // Evaluación exclusiva: si el pedido es de mayoreo, solo aplica la regla de mayoreo.
    // La regla de mayoreo NUNCA otorga envío gratis.
    // Mayoreo se activa si el peso supera el umbral O si la cantidad supera el mínimo de ítems.
    const wholesaleRule = rules.find((rule: RuleRow) => {
      const byWeight = rule.weight_threshold_lbs != null && rule.rate_per_lb != null && totalWeightLbs > rule.weight_threshold_lbs
      const byCount = rule.min_item_quantity != null && rule.min_item_quantity > 1 && totalItems >= rule.min_item_quantity
      return byWeight || byCount
    })
    const isWholesaleOrder = !!wholesaleRule

    let shipping_options: object[]

    if (isWholesaleOrder) {
      const rule = wholesaleRule!
      const medusaId = ruleToMedusaId.get(rule.id)

      if (medusaId) {
        const hasWeightException =
          rule.weight_threshold_lbs != null &&
          rule.rate_per_lb != null &&
          totalWeightLbs > rule.weight_threshold_lbs

        let amount: number
        if (hasWeightException) {
          const extraLbs = totalWeightLbs - (rule.weight_threshold_lbs ?? 0)
          amount = Math.round((rule.rate_per_lb ?? 0) * extraLbs * 100) / 100
        } else {
          // Bajo umbral de peso: tarifa fija. NUNCA gratis en mayoreo.
          amount = (rule.flat_rate ?? 0) / 100
        }

        shipping_options = [{ id: medusaId, rule_id: rule.id, name: rule.name, amount, provider_id: "mt-fulfillment" }]
      } else {
        shipping_options = []
      }
    } else {
      // No es mayoreo: evaluar solo reglas estándar (sin min_item_quantity de mayoreo)
      shipping_options = rules
        .filter((rule: RuleRow) => rule.min_item_quantity == null || rule.min_item_quantity <= 1)
        .map((rule: RuleRow) => {
          const medusaId = ruleToMedusaId.get(rule.id)
          if (!medusaId) return null

          const qualifiesFree = rule.free_above_amount != null && cartTotal >= rule.free_above_amount / 100
          const amount = qualifiesFree ? 0 : (rule.flat_rate ?? 0) / 100

          return { id: medusaId, rule_id: rule.id, name: rule.name, amount, provider_id: "mt-fulfillment" }
        })
        .filter(Boolean) as object[]
    }

    res.json({
      shipping_options,
      needs_setup: nativeOptions.length === 0,
    })
  } catch (err) {
    console.error("[mt-shipping-options GET]", err)
    res.status(500).json({ message: "Error al obtener las opciones de envío" })
  }
}
