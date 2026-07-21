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
    // Medusa no garantiza unit_price en context.items — leer el total directamente de la DB
    const items = context?.items ?? []
    const ctx = context as unknown as Record<string, unknown>
    const cartId =
      (ctx?.cart as Record<string, unknown> | undefined)?.id as string | undefined ??
      ctx?.cart_id as string | undefined ??
      (items[0] as unknown as Record<string, unknown>)?.cart_id as string | undefined

    // unit_price en cart_line_item está en centavos (ej. Q140 → 14000)
    let cartTotalCents = 0
    let cartTotalQ = 0

    if (cartId) {
      const { rows: cartRows } = await this.pool.query<{ total: string }>(
        `SELECT COALESCE(SUM(COALESCE(unit_price, 0) * COALESCE(quantity, 0)), 0) AS total
         FROM cart_line_item
         WHERE cart_id = $1 AND deleted_at IS NULL`,
        [cartId]
      )
      cartTotalCents = Number(cartRows[0]?.total ?? 0)
      cartTotalQ = cartTotalCents / 100  // quetzales para el calculador
    } else {
      // Fallback: context.items.unit_price también viene en centavos desde Medusa
      cartTotalCents = items.reduce(
        (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity),
        0
      )
      cartTotalQ = cartTotalCents / 100
    }

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
    // min/max_order_amount en la DB están en centavos → pasar cartTotalCents
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
        [cartTotalCents]
      )
      rule = rows[0]
    }

    if (!rule) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    // Calcular peso total — weight_unit desde variante primero, luego producto
    const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0)

    const variantIds = [...new Set(
      items.map((i) => (i as unknown as Record<string, unknown>).variant_id as string | undefined).filter(Boolean)
    )] as string[]

    const weightUnitByVariant: Record<string, string> = {}

    if (variantIds.length > 0) {
      const { rows: variantRows } = await this.pool.query<{
        id: string
        weight: number | null
        weight_unit: string | null
      }>(
        `SELECT pv.id,
                pv.weight,
                COALESCE(
                  pv.metadata->>'weight_unit',
                  p.metadata->>'weight_unit'
                ) AS weight_unit
         FROM product_variant pv
         LEFT JOIN product p ON p.id = pv.product_id
         WHERE pv.id = ANY($1)`,
        [variantIds]
      )
      for (const v of variantRows) {
        weightUnitByVariant[v.id] = v.weight_unit ?? "g"
      }
    }

    const weightItems: CartItemWeight[] = items.map((item) => {
      const variantId = (item as unknown as Record<string, unknown>).variant_id as string | undefined
      return {
        weightRaw:  item.variant?.weight ?? 0,
        weightUnit: (variantId ? weightUnitByVariant[variantId] : undefined) ?? "g",
        quantity:   Number(item.quantity),
        variantId,
      }
    })

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
