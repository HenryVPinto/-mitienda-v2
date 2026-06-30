export type CreateShippingRuleInput = {
  name: string
  description?: string
  region_code?: string
  min_order_amount?: number
  max_order_amount?: number
  flat_rate?: number
  free_above_amount?: number
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
