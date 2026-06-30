export type PromoRuleType = "COMBO" | "GIFT" | "QUANTITY_DISCOUNT" | "WHOLESALE"

export type CreatePromoRuleInput = {
  name: string
  type: PromoRuleType
  description?: string | null
  is_active?: boolean
  starts_at?: string | null
  ends_at?: string | null
  min_quantity?: number | null
  discount_percentage?: number | null
  discount_amount?: number | null
  gift_product_id?: string | null
  gift_quantity?: number | null
  metadata?: Record<string, unknown> | null
}

export type UpdatePromoRuleInput = Partial<CreatePromoRuleInput>
