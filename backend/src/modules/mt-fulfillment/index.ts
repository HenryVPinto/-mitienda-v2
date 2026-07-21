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
  weight_threshold_lbs: number | null
  rate_per_lb: number | null
  min_item_quantity: number | null
}

// Factores de conversión a libras
const TO_LBS: Record<string, number> = {
  lb: 1,
  lbs: 1,
  g: 1 / 453.592,
  kg: 2.20462,
  oz: 0.0625,
}

class MtFulfillmentProviderService extends AbstractFulfillmentProviderService {
  static identifier = "mt-fulfillment"

  private pool: Pool

  constructor() {
    super()
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }

  // Cada regla activa del módulo MtShippingRule aparece como opción en Medusa admin
  async getFulfillmentOptions() {
    const { rows } = await this.pool.query<Pick<ShippingRule, "id" | "name">>(
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
    const cartTotal = context?.items?.reduce(
      (sum, item) => sum + Number(item.unit_price ?? 0) * Number(item.quantity),
      0
    ) ?? 0
    const ruleId = (optionData as Record<string, unknown>)?.id as string | undefined

    let rule: ShippingRule | undefined

    if (ruleId) {
      const { rows } = await this.pool.query<ShippingRule>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount,
                region_code, priority, weight_threshold_lbs, rate_per_lb, min_item_quantity
         FROM mt_shipping_rule
         WHERE id = $1 AND is_active = true AND deleted_at IS NULL
         LIMIT 1`,
        [ruleId]
      )
      rule = rows[0]
    }

    if (!rule) {
      const { rows } = await this.pool.query<ShippingRule>(
        `SELECT id, name, flat_rate, free_above_amount, min_order_amount, max_order_amount,
                region_code, priority, weight_threshold_lbs, rate_per_lb, min_item_quantity
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

    const items = context?.items ?? []
    const totalQty = items.reduce((sum, item) => sum + Number(item.quantity), 0)

    // Los precios en esta instancia de Medusa están en quetzales (no centavos).
    // flat_rate y free_above_amount se guardan en centavos en la DB → dividir entre 100.
    const flatRateQ = (rule.flat_rate ?? 0) / 100
    const freeThresholdQ = rule.free_above_amount != null ? rule.free_above_amount / 100 : null

    // Lógica de tarifa por peso (mayoreo)
    if (rule.weight_threshold_lbs != null && rule.rate_per_lb != null) {
      // Calcular peso total primero — el peso también puede activar mayoreo
      const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))]
      let weightUnitByProduct: Record<string, string> = {}

      if (productIds.length > 0) {
        const { rows: productRows } = await this.pool.query<{ id: string; metadata: Record<string, unknown> | null }>(
          `SELECT id, metadata FROM product WHERE id = ANY($1)`,
          [productIds]
        )
        for (const p of productRows) {
          weightUnitByProduct[p.id] = (p.metadata?.weight_unit as string) ?? "g"
        }
      }

      for (const item of items) {
        if (!(item.variant?.weight ?? 0)) {
          console.warn(`[mt-fulfillment] item variant ${(item as Record<string, unknown>).variant_id ?? "?"} tiene peso 0 o null — no contribuye al cálculo de envío por peso`)
        }
      }

      const totalWeightLbs = items.reduce((sum, item) => {
        const rawWeight = item.variant?.weight ?? 0
        const unit = weightUnitByProduct[item.product_id ?? ""] ?? "g"
        const factor = TO_LBS[unit] ?? TO_LBS["g"]
        return sum + rawWeight * factor * Number(item.quantity)
      }, 0)

      const weightExceedsThreshold = totalWeightLbs > rule.weight_threshold_lbs
      const itemsExceedMinQty = rule.min_item_quantity == null || totalQty >= rule.min_item_quantity

      console.info(`[mt-fulfillment] rule=${rule.id} totalWeightLbs=${totalWeightLbs.toFixed(4)} threshold=${rule.weight_threshold_lbs} totalQty=${totalQty} minQty=${rule.min_item_quantity}`)

      // Mayoreo aplica si el peso supera el umbral O si la cantidad supera el mínimo
      if (weightExceedsThreshold || itemsExceedMinQty) {
        if (weightExceedsThreshold) {
          const extraLbs = totalWeightLbs - rule.weight_threshold_lbs
          const weightCost = Math.round(extraLbs * rule.rate_per_lb * 100) / 100
          console.info(`[mt-fulfillment] mayoreo por peso: extraLbs=${extraLbs.toFixed(4)} rate=${rule.rate_per_lb} weightCost=${weightCost} total=${flatRateQ + weightCost}`)
          return { calculated_amount: flatRateQ + weightCost, is_calculated_price_tax_inclusive: false }
        }
        // Cantidad activa mayoreo pero peso bajo umbral: tarifa fija, NUNCA gratis
        console.info(`[mt-fulfillment] mayoreo por cantidad, peso bajo umbral: flatRate=${flatRateQ}`)
        return { calculated_amount: flatRateQ, is_calculated_price_tax_inclusive: false }
      }
    }

    // Lógica estándar: envío gratis si supera umbral, o tarifa fija
    const isFree = freeThresholdQ != null && cartTotal >= freeThresholdQ
    const amount = isFree ? 0 : flatRateQ

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

// module-provider-loader espera { services: [...] } y load-internal espera loadedProvider_.services iterable
export default { services: [MtFulfillmentProviderService] }
