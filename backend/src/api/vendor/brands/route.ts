import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)

  const [brands] = await brandService.listAndCountMtBrands(
    {},
    { select: ["id", "name"] }
  )

  return res.json({ brands })
}
