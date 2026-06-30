export type CreateBrandInput = {
  name: string
  handle: string
  description?: string
  logo_url?: string
  website_url?: string
  is_active?: boolean
  metadata?: Record<string, unknown>
}

export type UpdateBrandInput = Partial<CreateBrandInput>

export type BrandFilters = {
  id?: string | string[]
  handle?: string
  is_active?: boolean
}
