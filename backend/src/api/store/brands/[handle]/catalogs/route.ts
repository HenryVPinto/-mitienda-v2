import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  const [brand] = await brandService.listMtBrands({
    handle: req.params.handle,
    is_active: true,
  })

  if (!brand) {
    return res.status(404).json({ type: "not_found", message: "Brand not found" })
  }

  const [catalogs, count] = await brandService.listAndCountMtBrandCatalogs(
    { brand_id: brand.id, is_active: true },
    { order: { sort_order: "ASC", created_at: "ASC" } }
  )

  res.json({ brand, catalogs, count })
}
