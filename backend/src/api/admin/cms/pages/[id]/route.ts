import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const page = await service.retrieveMtPage(id)
  return res.json({ page })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const [page] = await service.updateMtPages([{ id, ...(req.body as Record<string, any>) }])
  return res.json({ page })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  await service.deleteMtPages(id)
  return res.json({ success: true })
}
