import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const faq_item = await service.retrieveMtFaqItem(id)
  return res.json({ faq_item })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  const [faq_item] = await service.updateMtFaqItems([{ id, ...(req.body as Record<string, any>) }])
  return res.json({ faq_item })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any
  await service.deleteMtFaqItems(id)
  return res.json({ success: true })
}
