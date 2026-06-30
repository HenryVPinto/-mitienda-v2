import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const [brands, count] = await brandService.listAndCountMtBrands(
    { is_active: true },
    {
      skip: Number(req.query.offset) || 0,
      take: Number(req.query.limit) || 50,
    }
  )
  res.json({ brands, count })
}
