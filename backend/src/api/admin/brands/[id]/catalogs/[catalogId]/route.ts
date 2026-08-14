import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../../../modules/brand"
import BrandModuleService from "../../../../../../modules/brand/service"

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const { title, description, file_url, cover_image_url, sort_order, is_active } = req.body as any
  const catalog = await brandService.updateMtBrandCatalogs(
    { id: req.params.catalogId },
    { title, description, file_url, cover_image_url, sort_order, is_active }
  )
  res.json({ catalog })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  await brandService.deleteMtBrandCatalogs({ id: req.params.catalogId })
  res.json({ deleted: true })
}
