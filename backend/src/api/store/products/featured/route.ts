import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const PRODUCT_FIELDS = [
  "id", "title", "handle", "thumbnail",
  "images.*",
  "variants.id", "variants.prices.*", "variants.metadata",
  "mt_brand.*", "mt_vendor.*",
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const limit = Number(req.query.limit ?? 8)

  const pgClient = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { rows } = await pgClient.raw(
    `SELECT id FROM product WHERE metadata->>'is_featured' = 'true' AND deleted_at IS NULL AND status = 'published' LIMIT ?`,
    [limit]
  )
  const productIds: string[] = rows.map((r: any) => r.id).filter(Boolean)

  if (!productIds.length) {
    return res.json({ products: [], count: 0 })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: productIds },
  })

  return res.json({ products, count: products.length })
}
