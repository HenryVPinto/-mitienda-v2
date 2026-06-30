import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const banner = await service.retrieveMtBanner(id)
  return res.json({ banner })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const [banner] = await service.updateMtBanners([{ id, ...(req.body as Record<string, any>) }])
  return res.json({ banner })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  await service.deleteMtBanners(id)
  return res.json({ success: true })
}
