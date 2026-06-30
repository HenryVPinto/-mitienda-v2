import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const { category } = req.query as any

  const filters: Record<string, any> = { is_active: true }
  if (category) filters.category = category

  const faq_items = await service.listMtFaqItems(filters, {
    order: { sort_order: "ASC" },
  })
  return res.json({ faq_items })
}
