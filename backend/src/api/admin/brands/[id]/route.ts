import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"
import { UpdateBrandInput } from "../../../../modules/brand/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const brand = await brandService.retrieveMtBrand(req.params.id)
  res.json({ brand })
}

export const PATCH = async (
  req: MedusaRequest<UpdateBrandInput>,
  res: MedusaResponse
) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const [brand] = await brandService.updateMtBrands({
    selector: { id: req.params.id },
    data: req.body,
  })
  res.json({ brand })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  await brandService.deleteMtBrands([req.params.id])
  res.json({ id: req.params.id, object: "brand", deleted: true })
}
