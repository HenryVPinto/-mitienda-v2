import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

const PRODUCT_FIELDS = [
  "id", "title", "handle", "thumbnail",
  "images.*",
  "variants.id", "variants.prices.*",
  "mt_brand.*", "mt_vendor.*",
]

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { handle } = req.params
  const limit = Number(req.query.limit ?? 12)
  const offset = Number(req.query.offset ?? 0)

  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const [brand] = await brandService.listMtBrands({ handle, is_active: true })
  if (!brand) {
    return res.status(404).json({ type: "not_found", message: "Brand not found" })
  }

  const pgClient = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { rows } = await pgClient.raw(
    `SELECT product_id FROM product_product_brand_mt_brand WHERE mt_brand_id = ? AND deleted_at IS NULL`,
    [brand.id]
  )
  const productIds: string[] = rows.map((r: any) => r.product_id).filter(Boolean)

  if (!productIds.length) {
    return res.json({ brand, products: [], count: 0, limit, offset })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: productIds },
    pagination: { take: limit, skip: offset },
  })

  return res.json({
    brand,
    products,
    count: metadata?.count ?? products.length,
    limit,
    offset,
  })
}
