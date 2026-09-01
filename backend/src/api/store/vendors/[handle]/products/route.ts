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

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Step 1: get all product IDs linked to this vendor via query.graph
  const { data: vendors } = await query.graph({
    entity: "mt_vendor",
    fields: ["id", "product.id", "product.status"],
    filters: { id: vendor.id },
  })

  const allLinkedProducts: Array<{ id: string; status: string }> = Array.isArray(vendors[0]?.product)
    ? vendors[0].product
    : vendors[0]?.product
      ? [vendors[0].product]
      : []

  const publishedIds = allLinkedProducts
    .filter((p) => p.status === "published")
    .map((p) => p.id)

  if (!publishedIds.length) {
    return res.json({ products: [], count: publishedIds.length, limit, offset })
  }

  // Step 2: fetch full product data with pagination
  const { data: products, metadata } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { id: publishedIds },
    pagination: { take: limit, skip: offset },
  })

  return res.json({
    products,
    count: metadata?.count ?? publishedIds.length,
    limit,
    offset,
  })
}
