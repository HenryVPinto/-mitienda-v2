import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"
import {
  calcTotalWeightLbs,
  calcShippingAmount,
  selectApplicableRules,
  type ShippingRuleData,
  type CartItemWeight,
  type ShippingContext,
} from "../../../modules/shipping-rules/utils/shipping-calculator"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /store/mt-shipping-options?cart_id=...
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cart_id = req.query.cart_id as string | undefined
  if (!cart_id) {
    return res.status(400).json({ message: "cart_id es requerido" })
  }

  try {
    // 1. Items del carrito — weight_unit se lee de variant.metadata primero, luego product.metadata
    const { rows: itemRows } = await pool.query(
      `SELECT
         COALESCE(cli.unit_price, 0)  AS unit_price,
         COALESCE(cli.quantity,   0)  AS quantity,
         COALESCE(pv.weight, p.weight, 0)  AS weight_raw,
         cli.variant_id,
         cli.metadata                 AS item_metadata,
         COALESCE(
           pv.metadata->>'weight_unit',
           p.metadata->>'weight_unit'
         )                            AS weight_unit
       FROM  cart_line_item cli
       LEFT JOIN product_variant pv ON pv.id = cli.variant_id
       LEFT JOIN product p           ON p.id  = pv.product_id
       WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL`,
      [cart_id]
    )

    type TierRule = { min_quantity: number; discount_percentage: number }
    type ItemRow = {
      unit_price: string | number
      quantity: string | number
      weight_raw: string | number
      variant_id: string | null
      item_metadata: { tier_rules?: TierRule[]; base_unit_price?: number } | null
      weight_unit: string | null
    }

    // 2. Totales del carrito
    // unit_price en cart_line_item está en centavos (ej. Q140 → 14000)
    const cartTotalCents = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0),
      0
    )
    const cartTotalQ = cartTotalCents / 100  // quetzales para el calculador
    const totalItems = itemRows.reduce(
      (sum: number, r: ItemRow) => sum + (Number(r.quantity) || 0),
      0
    )

    // 3. Peso total en libras (usando el utilitario compartido)
    const weightItems: CartItemWeight[] = itemRows.map((r: ItemRow) => {
      const weightRaw  = Number(r.weight_raw) || 0
      const weightUnit = r.weight_unit ?? "g"
      const qty        = Number(r.quantity) || 0
      console.log(`[mt-shipping-options][item] cart=${cart_id} variant=${r.variant_id} weight_raw=${r.weight_raw} weight_unit=${r.weight_unit} qty=${r.quantity} → raw=${weightRaw} unit=${weightUnit}`)
      return { weightRaw, weightUnit, quantity: qty, variantId: r.variant_id ?? undefined }
    })
    const totalWeightLbs = calcTotalWeightLbs(weightItems)

    // Mayoreo: reutilizar la misma lógica que el módulo de precios (metadata.tier_rules)
    const isWholesaleCart = itemRows.some((r: ItemRow) => {
      const tiers = r.item_metadata?.tier_rules ?? []
      return tiers.some((t) => Number(r.quantity) >= t.min_quantity)
    })
    console.log(`[mt-shipping-options][totals] cart=${cart_id} items=${itemRows.length} totalItems=${totalItems} totalWeightLbs=${totalWeightLbs.toFixed(4)} cartTotalQ=${cartTotalQ} isWholesale=${isWholesaleCart}`)

    const context: ShippingContext = { cartTotalQ, totalItems, totalWeightLbs, isWholesaleCart }

    // 4. IDs de opciones nativas de Medusa para el provider mt-fulfillment
    const { rows: nativeOptions } = await pool.query(`
      SELECT so.id          AS medusa_option_id,
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

    // 5. Reglas activas filtradas por monto del carrito, ordenadas por prioridad
    // min/max_order_amount en la DB están en centavos → pasar cartTotalCents
    const { rows: rules } = await pool.query<ShippingRuleData>(
      `SELECT id, name, flat_rate, free_above_amount,
              weight_threshold_lbs, rate_per_lb, min_item_quantity,
              min_order_amount, max_order_amount, priority, metadata
       FROM   mt_shipping_rule
       WHERE  is_active = true AND deleted_at IS NULL
         AND  (min_order_amount IS NULL OR min_order_amount <= $1)
         AND  (max_order_amount IS NULL OR max_order_amount >= $1)
       ORDER BY priority DESC`,
      [cartTotalCents]
    )

    // 6. Seleccionar reglas aplicables y calcular montos
    const applicableRules = selectApplicableRules(rules, context)

    console.log(`[mt-shipping-options][rules] total_rules=${rules.length} applicable=${applicableRules.length} applicable_names=${applicableRules.map(r=>r.name).join(",")}`)
    const shipping_options = applicableRules
      .map((rule) => {
        const medusaId = ruleToMedusaId.get(rule.id)
        if (!medusaId) { console.log(`[mt-shipping-options][WARN] rule "${rule.name}" no tiene Medusa ID — no se incluirá`); return null }
        const amount = calcShippingAmount(rule, context)
        console.log(`[mt-shipping-options][result] rule="${rule.name}" flat_rate=${rule.flat_rate} free_above=${rule.free_above_amount} threshold=${rule.weight_threshold_lbs} rate_per_lb=${rule.rate_per_lb} min_items=${rule.min_item_quantity} → amount=${amount}`)
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
