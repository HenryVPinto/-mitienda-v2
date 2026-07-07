export type CreateShippingRuleInput = {
  name: string
  description?: string
  region_code?: string
  min_order_amount?: number
  max_order_amount?: number
  flat_rate?: number
  free_above_amount?: number
  weight_threshold_lbs?: number | null
  rate_per_lb?: number | null
  min_item_quantity?: number | null
  is_active?: boolean
  priority?: number
  metadata?: Record<string, unknown>
}

export type UpdateShippingRuleInput = Partial<CreateShippingRuleInput>

export type ShippingRuleFilters = {
  id?: string | string[]
  region_code?: string
  is_active?: boolean
}
