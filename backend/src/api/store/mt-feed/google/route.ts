import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const STORE_URL = process.env.STOREFRONT_URL ?? "https://mitienda.com.gt"
const BATCH = 250

const PRODUCT_FIELDS = [
  "id",
  "title",
  "description",
  "handle",
  "status",
  "thumbnail",
  "images.*",
  "categories.id",
  "categories.name",
  "variants.id",
  "variants.title",
  "variants.sku",
  "variants.inventory_quantity",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "variants.prices.*",
  "variants.metadata",
  "mt_brand.name",
  "mt_product_extension.description_html",
]

function escapeXml(str: string | null | undefined): string {
  if (!str) return ""
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function getGtqPrice(prices: any[]): number | null {
  if (!Array.isArray(prices) || !prices.length) return null
  const gtq = prices.find((p) => p.currency_code === "gtq" || p.currency_code === "GTQ")
  if (!gtq) return null
  return gtq.amount
}

function isInStock(variant: any): boolean {
  if (!variant.manage_inventory) return true
  if (variant.allow_backorder) return true
  return (variant.inventory_quantity ?? 0) > 0
}

function getImageUrl(product: any, variant: any): string {
  // Priorizar thumbnail de variante si existe, luego producto
  if (variant.thumbnail) return variant.thumbnail
  if (product.thumbnail) return product.thumbnail
  const imgs: any[] = product.images ?? []
  return imgs[0]?.url ?? ""
}

function buildItem(product: any, variant: any, hasMultipleVariants: boolean): string {
  const price = getGtqPrice(variant.prices)
  if (price === null) return ""

  const id = `${product.id}_${variant.id}`
  const title = hasMultipleVariants
    ? `${product.title} – ${variant.title}`
    : product.title
  const description = product.description ?? product.title
  const link = `${STORE_URL}/productos/${product.handle}`
  const imageUrl = getImageUrl(product, variant)
  const availability = isInStock(variant) ? "in stock" : "out of stock"
  const priceFormatted = `${price.toFixed(2)} GTQ`
  const brand = product.mt_brand?.name ?? "MiTienda"
  const category = product.categories?.[0]?.name ?? ""

  let xml = `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(title)}</g:title>
      <g:description>${escapeXml(description)}</g:description>
      <g:link>${escapeXml(link)}</g:link>
      <g:availability>${availability}</g:availability>
      <g:price>${priceFormatted}</g:price>
      <g:brand>${escapeXml(brand)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>`

  if (imageUrl) {
    xml += `\n      <g:image_link>${escapeXml(imageUrl)}</g:image_link>`
  }

  if (category) {
    xml += `\n      <g:product_type>${escapeXml(category)}</g:product_type>`
  }

  if (hasMultipleVariants) {
    xml += `\n      <g:item_group_id>${escapeXml(product.id)}</g:item_group_id>`
  }

  if (variant.sku) {
    xml += `\n      <g:mpn>${escapeXml(variant.sku)}</g:mpn>`
  }

  xml += `\n    </item>\n`
  return xml
}

// GET /store/mt-feed/google
// Retorna el feed XML de Google Merchant Center con todos los productos publicados.
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const allProducts: any[] = []
  let skip = 0

  while (true) {
    const { data: batch, metadata } = await query.graph({
      entity: "product",
      fields: PRODUCT_FIELDS,
      filters: { status: "published" },
      pagination: { take: BATCH, skip },
    })

    if (!batch.length) break
    allProducts.push(...batch)

    if (allProducts.length >= (metadata?.count ?? 0)) break
    skip += BATCH
  }

  let items = ""
  for (const product of allProducts) {
    const variants: any[] = Array.isArray(product.variants) ? product.variants : []
    const hasMultiple = variants.length > 1

    for (const variant of variants) {
      items += buildItem(product, variant, hasMultiple)
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>MiTienda Guatemala</title>
    <link>${STORE_URL}</link>
    <description>Catálogo de productos MiTienda — Guatemala</description>
${items}  </channel>
</rss>`

  res.setHeader("Content-Type", "application/xml; charset=utf-8")
  res.setHeader("Cache-Control", "public, max-age=3600")
  res.status(200).send(xml)
}
