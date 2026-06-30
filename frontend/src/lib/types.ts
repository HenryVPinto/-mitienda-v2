export type PricingTier = {
  rule_id: string
  name: string
  min_quantity: number
  discount_percentage: number
}

export type ProductImage = {
  id: string
  url: string
}

export type ProductOption = {
  id: string
  title: string
  values: { id: string; value: string }[]
}

export type VariantPrice = {
  id: string
  amount: number
  currency_code: string
  price_list_id?: string | null
  price_list?: {
    id: string
    name: string
    type: string
    rules?: Record<string, unknown>
  } | null
  rules?: {
    quantity?: {
      gte?: number
      lte?: number
    }
  }
}

export type ProductVariant = {
  id: string
  title: string
  sku?: string | null
  inventory_quantity?: number
  allow_backorder?: boolean
  manage_inventory?: boolean
  options: { id: string; value: string; option_id: string }[]
  prices: VariantPrice[]
  calculated_price?: {
    calculated_amount: number
    original_amount: number
    currency_code: string
  }
  metadata?: Record<string, unknown> | null
  images?: { id: string; url: string }[]
}

export type Category = {
  id: string
  name: string
  handle: string
  description?: string | null
  parent_category_id?: string | null
  category_children?: Category[]
  metadata?: Record<string, unknown> | null
}

export type Brand = {
  id: string
  name: string
  handle: string
  logo_url?: string | null
}

export type Vendor = {
  id: string
  name: string
  handle: string
  description?: string | null
  logo_url?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  city?: string | null
  is_active: boolean
  metadata?: Record<string, unknown> | null
}

export type ProductExtension = {
  id: string
  wholesale_price?: number | null
  weight?: number | null
  description_html?: string | null
  metadata?: Record<string, unknown> | null
}

export type Product = {
  id: string
  title: string
  handle: string
  description?: string | null
  thumbnail?: string | null
  images?: ProductImage[]
  options?: ProductOption[]
  variants: ProductVariant[]
  categories?: Category[]
  collection_id?: string | null
  collection?: { id: string; title: string; handle: string } | null
  tags?: { id: string; value: string }[]
  material?: string | null
  weight?: number | null
  height?: number | null
  width?: number | null
  length?: number | null
  metadata?: Record<string, unknown> | null
  mt_brand?: Brand | null
  mt_vendor?: Vendor | null
  mt_product_extension?: ProductExtension | null
}

export type LineItem = {
  id: string
  title: string
  thumbnail?: string | null
  variant_id: string
  variant?: {
    id: string
    title: string
    product?: { id: string; handle: string; title: string; thumbnail?: string | null; images?: { id: string; url: string }[] }
  }
  quantity: number
  unit_price: number
  total: number
  metadata?: Record<string, unknown> | null
}

export type Cart = {
  id: string
  items: LineItem[]
  total: number
  subtotal: number
  discount_total: number
  shipping_total: number
  tax_total: number
  region_id?: string
  email?: string | null
  shipping_address?: Address | null
  completed_at?: string | null
}

export type Address = {
  first_name?: string
  last_name?: string
  address_1?: string
  city?: string
  phone?: string
  country_code?: string
}

export type ShippingOption = {
  id: string
  name: string
  amount: number
  provider_id: string
}

export type Order = {
  id: string
  display_id?: number
  status: string
  payment_status?: string
  fulfillment_status?: string
  total: number
  subtotal: number
  shipping_total?: number
  items: LineItem[]
  shipping_address?: Address | null
  email?: string | null
}

export type Banner = {
  id: string
  title: string
  subtitle?: string | null
  image_url: string
  link_url?: string | null
  position: string
  is_active: boolean
}

export type FaqItem = {
  id: string
  question: string
  answer: string
  category?: string | null
  sort_order?: number
}

export type CmsPage = {
  id: string
  title: string
  slug: string
  content: string
  is_published: boolean
}

export type AppliedPromotion = {
  rule_id: string
  rule_name: string
  type: string
  applied_to: string[]
  discount_percentage?: number
  discount_amount?: number
  gift_product_id?: string
  gift_quantity?: number
  savings: number
}

export type PromotionsEvaluateResponse = {
  applicable_promotions: AppliedPromotion[]
  total_savings: number
  policy: string
}
