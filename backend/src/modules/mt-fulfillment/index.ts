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

    // Medusa pasa los items del carrito directamente en el contexto.
    // unit_price está en quetzales (ej. Q350 → 350), NO en centavos.
    type CtxItem = {
      unit_price?: number
      quantity?: number
      variant_id?: string
      metadata?: Record<string, unknown> | null
    }
    const ctxItems = ((context as unknown as Record<string, unknown>).items as CtxItem[] | undefined) ?? []

    // Si el contexto no trae items, intentar leer del cart en DB como fallback
    let cartTotalQ: number
    let totalQty: number
    let isWholesaleCart: boolean
    let variantIds: string[]

    if (ctxItems.length > 0) {
      // unit_price en quetzales — sin división
      cartTotalQ = ctxItems.reduce(
        (sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.quantity) || 0), 0
      )
      totalQty = ctxItems.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0)
      isWholesaleCart = ctxItems.some((i) => {
        const tiers = (i.metadata?.tier_rules as { min_quantity: number }[] | undefined) ?? []
        return tiers.some((t) => Number(i.quantity) >= t.min_quantity)
      })
      variantIds = ctxItems.map((i) => i.variant_id).filter(Boolean) as string[]
    } else if (cartId) {
      // Fallback: leer del cart en DB (unit_price en quetzales)
      type ItemRow = {
        unit_price: string | number; quantity: string | number
        variant_id: string | null
        item_metadata: { tier_rules?: { min_quantity: number }[] } | null
      }
      const { rows: dbItems } = await this.pool.query<ItemRow>(
        `SELECT COALESCE(cli.unit_price,0) AS unit_price, COALESCE(cli.quantity,0) AS quantity,
                cli.variant_id, cli.metadata AS item_metadata
         FROM cart_line_item cli WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL`,
        [cartId]
      )
      cartTotalQ = dbItems.reduce(
        (sum, r) => sum + (Number(r.unit_price) || 0) * (Number(r.quantity) || 0), 0
      )
      totalQty = dbItems.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)
      isWholesaleCart = dbItems.some((r) => {
        const tiers = r.item_metadata?.tier_rules ?? []
        return tiers.some((t) => Number(r.quantity) >= t.min_quantity)
      })
      variantIds = dbItems.map((r) => r.variant_id).filter(Boolean) as string[]
    } else {
      console.warn("[mt-fulfillment] calculatePrice sin items en contexto ni cartId")
      const fallback = (rule.flat_rate ?? 0) / 100
      return { calculated_amount: fallback, is_calculated_price_tax_inclusive: false }
    }

    // Pesos por variante desde la DB
    type WeightRow = { variant_id: string; weight_raw: string | number; weight_unit: string | null }
    const weightRows = variantIds.length > 0
      ? (await this.pool.query<WeightRow>(
          `SELECT pv.id AS variant_id,
                  COALESCE(pv.weight, p.weight, 0) AS weight_raw,
                  COALESCE(pv.metadata->>'weight_unit', p.metadata->>'weight_unit') AS weight_unit
           FROM product_variant pv LEFT JOIN product p ON p.id = pv.product_id
           WHERE pv.id = ANY($1)`,
          [variantIds]
        )).rows
      : []

    const weightMap = new Map(weightRows.map((r) => [r.variant_id, r]))

    const weightItems: CartItemWeight[] = (ctxItems.length > 0 ? ctxItems : []).map((i) => {
      const w = weightMap.get(i.variant_id ?? "")
      const weightRaw  = Number(w?.weight_raw) || 0
      const weightUnit = w?.weight_unit ?? "g"
      const qty = Number(i.quantity) || 0
      return { weightRaw, weightUnit, quantity: qty, variantId: i.variant_id }
    })

    const totalWeightLbs = calcTotalWeightLbs(weightItems)
    console.log(
      `[mt-fulfillment][rule] name="${rule.name}" flat_rate=${rule.flat_rate} free_above=${rule.free_above_amount} cartTotalQ=${cartTotalQ} totalItems=${totalQty} totalWeightLbs=${totalWeightLbs.toFixed(4)} isWholesale=${isWholesaleCart} ctxItems=${ctxItems.length}`
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
