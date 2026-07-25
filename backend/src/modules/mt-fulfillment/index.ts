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

    // Tipo normalizado para items (contexto o DB) — fuente única para totales y pesos
    type NormalizedItem = {
      variant_id: string | undefined
      unit_price: number
      quantity: number
      metadata: Record<string, unknown> | null
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

    // Log diagnóstico: ver exactamente qué trae Medusa en context.items
    if (ctxItems.length > 0) {
      console.log(`[mt-fulfillment][ctx] cartId=${cartId} ctxItems=${ctxItems.length} first_keys=${Object.keys(ctxItems[0] ?? {}).join(",")}`)
      console.log(`[mt-fulfillment][ctx] first_item variant_id="${ctxItems[0]?.variant_id}" unit_price=${ctxItems[0]?.unit_price} qty=${ctxItems[0]?.quantity}`)
    }

    // sourceItems: lista normalizada de items — puede venir del contexto o de DB.
    // CRÍTICO: se usa tanto para los totales como para el cálculo de pesos.
    let sourceItems: NormalizedItem[]

    if (ctxItems.length > 0) {
      sourceItems = ctxItems.map((i) => ({
        variant_id: i.variant_id,
        unit_price: Number(i.unit_price) || 0,
        quantity: Number(i.quantity) || 0,
        metadata: i.metadata ?? null,
      }))
      console.log(`[mt-fulfillment][source] usando context.items (${sourceItems.length} items)`)
    } else if (cartId) {
      // Fallback: leer del cart en DB (unit_price en quetzales)
      type ItemRow = {
        unit_price: string | number
        quantity: string | number
        variant_id: string | null
        item_metadata: { tier_rules?: { min_quantity: number }[] } | null
      }
      const { rows: dbItems } = await this.pool.query<ItemRow>(
        `SELECT COALESCE(cli.unit_price,0) AS unit_price, COALESCE(cli.quantity,0) AS quantity,
                cli.variant_id, cli.metadata AS item_metadata
         FROM cart_line_item cli WHERE cli.cart_id = $1 AND cli.deleted_at IS NULL`,
        [cartId]
      )
      sourceItems = dbItems.map((r) => ({
        variant_id: r.variant_id ?? undefined,
        unit_price: Number(r.unit_price) || 0,
        quantity: Number(r.quantity) || 0,
        metadata: r.item_metadata as Record<string, unknown> | null,
      }))
      console.log(`[mt-fulfillment][source] usando DB fallback (${sourceItems.length} items, cartId=${cartId})`)
    } else {
      console.warn("[mt-fulfillment] calculatePrice sin items en contexto ni cartId")
      const fallback = (rule.flat_rate ?? 0) / 100
      return { calculated_amount: fallback, is_calculated_price_tax_inclusive: false }
    }

    // Totales del carrito desde sourceItems
    const cartTotalQ = sourceItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0)
    const totalQty = sourceItems.reduce((sum, i) => sum + i.quantity, 0)
    const isWholesaleCart = sourceItems.some((i) => {
      const tiers = (i.metadata?.tier_rules as { min_quantity: number }[] | undefined) ?? []
      return tiers.some((t) => i.quantity >= t.min_quantity)
    })
    const variantIds = sourceItems.map((i) => i.variant_id).filter(Boolean) as string[]

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

    // weightItems construido desde sourceItems — garantiza consistencia con los totales
    const weightItems: CartItemWeight[] = sourceItems.map((i) => {
      const w = weightMap.get(i.variant_id ?? "")
      const weightRaw  = Number(w?.weight_raw) || 0
      const weightUnit = w?.weight_unit ?? "g"
      return { weightRaw, weightUnit, quantity: i.quantity, variantId: i.variant_id }
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
