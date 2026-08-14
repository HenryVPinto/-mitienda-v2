import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  const [catalogs] = await brandService.listAndCountMtBrandCatalogs(
    { is_active: true },
    { select: ["brand_id"] }
  )

  const brandIds = [...new Set(catalogs.map((c) => c.brand_id))]

  if (brandIds.length === 0) {
    return res.json({ brands: [] })
  }

  const [brands] = await brandService.listAndCountMtBrands(
    { id: brandIds, is_active: true },
    { order: { name: "ASC" } }
  )

  res.json({ brands })
}
