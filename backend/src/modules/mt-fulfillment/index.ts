import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type { CreateShippingOptionDTO, CalculateShippingOptionPriceDTO } from "@medusajs/types"
import { Pool } from "pg"

type ShippingRule = {
  id: string
  name: string
  flat_rate: number | null
  free_above_amount: number | null
  min_order_amount: number | null
  max_order_amount: number | null
  region_code: string | null
  priority: number
}

class MtFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "mt-fulfillment"

  private pool: Pool

  constructor() {
    super()
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }

  // Cada regla activa aparece como opción seleccionable al configurar envíos en Medusa admin
  async getFulfillmentOptions() {
    const { rows } = await this.pool.query<Pick<ShippingRule, "id" | "name">>(
      `SELECT id, name
       FROM mt_shipping_rule
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY priority DESC`
    )
    return rows.map((r) => ({ id: r.id, name: r.name }))
  }

  // data devuelto aquí se almacena en la ShippingOption de Medusa
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
    const cartTotal = ((context as Record<string, unknown>)?.cart as { total?: number })?.total ?? 0
    const ruleId = (optionData as Record<string, unknown>)?.id as string | undefined

    let rule: ShippingRule | undefined

    if (ruleId) {
      // Regla específica vinculada a esta shipping option
      const { rows } = await this.pool.query<ShippingRule>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount, region_code, priority
         FROM mt_shipping_rule
         WHERE id = $1 AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [ruleId]
      )
      rule = rows[0]
    }

    if (!rule) {
      // Fallback: regla de mayor prioridad que aplique al monto del carrito
      const { rows } = await this.pool.query<ShippingRule>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount, region_code, priority
         FROM mt_shipping_rule
         WHERE is_active = true AND deleted_at IS NULL
           AND (min_order_amount IS NULL OR min_order_amount <= $1)
           AND (max_order_amount IS NULL OR max_order_amount >= $1)
         ORDER BY priority DESC
         LIMIT 1`,
        [cartTotal]
      )
      rule = rows[0]
    }

    if (!rule) {
      return { calculated_amount: 0, is_calculated_price_tax_inclusive: false }
    }

    const isFree = rule.free_above_amount != null && cartTotal >= rule.free_above_amount
    const amount = isFree ? 0 : (rule.flat_rate ?? 0)

    return { calculated_amount: amount, is_calculated_price_tax_inclusive: false }
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

export default MtFulfillmentProviderService
