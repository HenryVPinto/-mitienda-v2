import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../../modules/brand"
import BrandModuleService from "../../../../../modules/brand/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const [catalogs, count] = await brandService.listAndCountMtBrandCatalogs(
    { brand_id: req.params.id },
    { order: { sort_order: "ASC", created_at: "ASC" } }
  )
  res.json({ catalogs, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const brandService = req.scope.resolve<BrandModuleService>(BRAND_MODULE)
  const { title, description, file_url, cover_image_url, sort_order } = req.body as any
  if (!title?.trim() || !file_url?.trim()) {
    return res.status(400).json({ message: "title y file_url son requeridos" })
  }
  const catalog = await brandService.createMtBrandCatalogs({
    brand_id: req.params.id,
    title: title.trim(),
    description: description?.trim() || null,
    file_url: file_url.trim(),
    cover_image_url: cover_image_url?.trim() || null,
    sort_order: sort_order ?? 0,
  })
  res.status(201).json({ catalog })
}
