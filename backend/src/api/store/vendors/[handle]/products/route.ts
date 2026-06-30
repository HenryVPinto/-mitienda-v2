import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"

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

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendor] = await vendorService.listMtVendors({ handle, is_active: true })
  if (!vendor) {
    return res.status(404).json({ type: "not_found", message: "Vendor not found" })
  }

  const pgClient = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const { rows } = await pgClient.raw(
    `SELECT product_id FROM product_product_vendor_mt_vendor WHERE mt_vendor_id = ? AND deleted_at IS NULL`,
    [vendor.id]
  )
  const productIds: string[] = rows.map((r: any) => r.product_id).filter(Boolean)

  if (!productIds.length) {
    return res.json({ products: [], count: 0, limit, offset })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: productIds },
    pagination: { take: limit, skip: offset },
  })

  return res.json({
    products,
    count: metadata?.count ?? products.length,
    limit,
    offset,
  })
}
