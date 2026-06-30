export type CreateProductExtensionInput = {
  wholesale_price?: number | null
  weight?: number | null
  metadata?: Record<string, unknown> | null
  description_html?: string | null
}

export type UpdateProductExtensionInput = Partial<CreateProductExtensionInput>
