import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"

const PRODUCT_FIELDS = [
  "id", "title", "handle", "thumbnail", "status",
  "images.*",
  "variants.id", "variants.prices.*",
  "mt_brand.*", "mt_vendor.id",
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

  // Query from the product entity side to avoid mt_vendor→product published-only filter (pattern #9).
  // Filter by status here, then client-filter by vendor ID.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: { status: "published" },
    pagination: { take: 500 },
  })

  const vendorProducts = allProducts.filter((p: any) => {
    const v = Array.isArray(p.mt_vendor) ? p.mt_vendor[0] : p.mt_vendor
    return v?.id === vendor.id
  })

  const count = vendorProducts.length
  const paginated = vendorProducts.slice(offset, offset + limit)

  return res.json({ products: paginated, count, limit, offset })
}
