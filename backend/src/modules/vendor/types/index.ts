export type CreateVendorInput = {
  name: string
  handle: string
  description?: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  address?: string
  city?: string
  country_code?: string
  is_active?: boolean
  commission_rate?: number
  metadata?: Record<string, unknown>
}

export type UpdateVendorInput = Partial<CreateVendorInput>

export type VendorFilters = {
  id?: string | string[]
  handle?: string
  is_active?: boolean
}
