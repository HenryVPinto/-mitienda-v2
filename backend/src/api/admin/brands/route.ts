import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"
import { CreateBrandInput } from "../../../modules/brand/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const [brands, count] = await brandService.listAndCountMtBrands(
    {},
    {
      skip: Number(req.query.offset) || 0,
      take: Number(req.query.limit) || 50,
    }
  )
  res.json({ brands, count })
}

export const POST = async (
  req: MedusaRequest<CreateBrandInput>,
  res: MedusaResponse
) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const brand = await brandService.createMtBrands(req.body)
  res.status(201).json({ brand })
}
