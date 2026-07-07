import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import type { CreateShippingOptionDTO, CalculateShippingOptionPriceDTO } from "@medusajs/types"
import { Pool } from "pg"

type ShippingRule = {
  flat_rate: number | null
  free_above_amount: number | null
}

class MtFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "mt-fulfillment"

  private pool: Pool

  constructor() {
    super()
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }

  async getFulfillmentOptions() {
    return [{ id: "mt-standard", name: "Envío estándar Guatemala" }]
  }

  async validateFulfillmentData(_optionData: Record<string, unknown>, data: Record<string, unknown>, _context: Record<string, unknown>) {
    return data
  }

  async validateOption(_data: Record<string, unknown>) {
    return true
  }

  async canCalculate(_data: CreateShippingOptionDTO) {
    return true
  }

  async calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"]
  ) {
    const cart = (context as Record<string, unknown>)?.cart as { total?: number } | undefined
    const cartTotal = cart?.total ?? 0

    const { rows } = await this.pool.query<ShippingRule>(
      `SELECT flat_rate, free_above_amount
       FROM mt_shipping_rule
       WHERE is_active = true AND deleted_at IS NULL
       ORDER BY priority DESC
       LIMIT 1`
    )

    const rule = rows[0]

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
