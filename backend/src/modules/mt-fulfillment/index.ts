import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type { CreateShippingOptionDTO, CalculateShippingOptionPriceDTO } from "@medusajs/types"
import { Pool } from "pg"
import {
  calcTotalWeightLbs,
  calcShippingAmount,
  type ShippingRuleData,
  type CartItemWeight,
  type ShippingContext,
} from "../shipping-rules/utils/shipping-calculator"

class MtFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "mt-fulfillment"

  private pool: Pool

  constructor() {
    super()
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }

  // Cada regla activa aparece como opción seleccionable en Medusa admin
  async getFulfillmentOptions() {
    const { rows } = await this.pool.query<Pick<ShippingRuleData, "id" | "name">>(
      `SELECT id, name
       FROM mt_shipping_rule
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY priority DESC`
    )
    return rows.map((r) => ({ id: r.id, name: r.name }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: Record<string, unknown>
  ) {
    return { rule_id: optionData.id, ...data }
  }

  async validateOption(_data: Record<string, unknown>) {
    return true
  }

  async canCalculate(_data: CreateShippingOptionDTO) {
    return true
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ) {
    // CartPropsForFulfillment pone el cartId en context.id directamente (no en context.cart.id)
    const cartId = (context as unknown as Record<string, unknown>).id as string | undefined

    const ruleId = (optionData as Record<string, unknown>)?.id as string | undefined

    // Buscar la regla por ID (opción elegida por el cliente en checkout)
    let rule: ShippingRuleData | undefined

    if (ruleId) {
      const { rows } = await this.pool.query<ShippingRuleData>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount,
                weight_threshold_lbs, rate_per_lb, min_item_quantity, priority, metadata
         FROM mt_shipping_rule
         WHERE id = $1 AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [ruleId]
      )
      rule = rows[0]
    }

    if (!rule) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    // Sin cartId no podemos calcular — devolver tarifa base como fallback
    if (!cartId) {
      console.warn("[mt-fulfillment] calculatePrice llamado sin cartId en context")
      const fallback = (rule.flat_rate ?? 0) / 100
      return { calculated_amount: fallback, is_calculated_price_tax_inclusive: false }
    }

    // Leer items directamente desde la DB — misma lógica que /store/mt-shipping-options
    // unit_price en cart_line_item está en centavos (ej. Q140 → 14000)
    type ItemRow = {
      unit_price: string | number
      quantity: string | number
      weight_raw: string | number
      variant_id: string | null
      item_metadata: { tier_rules?: { min_quantity: number; discount_percentage: number }[] } | null
      weight_unit: string | null
    }

    const { rows: itemRows } = await this.pool.query<ItemRow>(
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
      [cartId]
    )

    const cartTotalCents = itemRows.reduce(
      (sum, r) => sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0),
      0
    )
    const cartTotalQ  = cartTotalCents / 100
    const totalQty    = itemRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)

    const isWholesaleCart = itemRows.some((r) => {
      const tiers = r.item_metadata?.tier_rules ?? []
      return tiers.some((t) => Number(r.quantity) >= t.min_quantity)
    })

    const weightItems: CartItemWeight[] = itemRows.map((r) => {
      const weightRaw  = Number(r.weight_raw) || 0
      const weightUnit = r.weight_unit ?? "g"
      const qty        = Number(r.quantity) || 0
      console.log(
        `[mt-fulfillment][weight] variant=${r.variant_id} raw=${weightRaw} unit=${weightUnit} qty=${qty} lineWeightRaw=${weightRaw * qty}`
      )
      return { weightRaw, weightUnit, quantity: qty, variantId: r.variant_id ?? undefined }
    })

    const totalWeightLbs = calcTotalWeightLbs(weightItems)
    console.log(
      `[mt-fulfillment][weight] totalWeightLbs=${totalWeightLbs.toFixed(4)} totalItems=${totalQty} cartTotalQ=${cartTotalQ}`
    )
    console.log(
      `[mt-fulfillment][rule] name="${rule.name}" flat_rate=${rule.flat_rate} threshold_lbs=${rule.weight_threshold_lbs} rate_per_lb=${rule.rate_per_lb} min_items=${rule.min_item_quantity}`
    )

    const shippingContext: ShippingContext = {
      cartTotalQ,
      totalItems: totalQty,
      totalWeightLbs,
      isWholesaleCart,
    }

    const amountQ = calcShippingAmount(rule, shippingContext)

    return { calculated_amount: amountQ, is_calculated_price_tax_inclusive: false }
  }

  async createFulfillment(
    _data: Record<string, unknown>,
    _items: Record<string, unknown>[],
    _order: Record<string, unknown> | undefined,
    _fulfillment: Record<string, unknown>
  ) {
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(_data: Record<string, unknown>) {
    return {}
  }

  async createReturnFulfillment(_fulfillment: Record<string, unknown>) {
    return { data: {}, labels: [] }
  }
}

// module-provider-loader espera { services: [...] }
export default { services: [MtFulfillmentProviderService] }
