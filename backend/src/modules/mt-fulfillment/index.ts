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
    const cartTotalQ =
      context?.items?.reduce(
        (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity),
        0
      ) ?? 0

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

    // Fallback: regla más prioritaria que coincida con el monto del carrito
    if (!rule) {
      const { rows } = await this.pool.query<ShippingRuleData>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount,
                weight_threshold_lbs, rate_per_lb, min_item_quantity, priority, metadata
         FROM mt_shipping_rule
         WHERE is_active = true AND deleted_at IS NULL
           AND (min_order_amount IS NULL OR min_order_amount <= $1)
           AND (max_order_amount IS NULL OR max_order_amount >= $1)
         ORDER BY priority DESC
         LIMIT 1`,
        [cartTotalQ]
      )
      rule = rows[0]
    }

    if (!rule) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    // Calcular peso total usando el utilitario compartido
    const items = context?.items ?? []
    const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0)

    const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))]
    const weightUnitByProduct: Record<string, string> = {}

    if (productIds.length > 0) {
      const { rows: productRows } = await this.pool.query<{
        id: string
        metadata: Record<string, unknown> | null
      }>(
        `SELECT id, metadata FROM product WHERE id = ANY($1)`,
        [productIds]
      )
      for (const p of productRows) {
        weightUnitByProduct[p.id] = (p.metadata?.weight_unit as string) ?? "g"
      }
    }

    const weightItems: CartItemWeight[] = items.map((item) => ({
      weightRaw:  item.variant?.weight ?? 0,
      weightUnit: weightUnitByProduct[item.product_id ?? ""] ?? "g",
      quantity:   Number(item.quantity),
      variantId:  (item as unknown as Record<string, unknown>).variant_id as string | undefined,
    }))

    const totalWeightLbs = calcTotalWeightLbs(weightItems)

    const shippingContext: ShippingContext = {
      cartTotalQ,
      totalItems: totalQty,
      totalWeightLbs,
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
