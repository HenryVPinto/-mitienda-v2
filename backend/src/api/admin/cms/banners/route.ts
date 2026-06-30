import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const { position } = req.query as any

  const filters: Record<string, any> = {}
  if (position) filters.position = position

  const banners = await service.listMtBanners(filters, {
    order: { sort_order: "ASC" },
  })
  return res.json({ banners })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const banner = await service.createMtBanners(req.body)
  return res.status(201).json({ banner })
}
