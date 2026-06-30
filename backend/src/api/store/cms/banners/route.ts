import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const { position } = req.query as any
  const now = new Date()

  const filters: Record<string, any> = { is_active: true }
  if (position) filters.position = position

  const all = await service.listMtBanners(filters, { order: { sort_order: "ASC" } })

  const banners = all.filter((b: any) => {
    if (b.starts_at && new Date(b.starts_at) > now) return false
    if (b.ends_at && new Date(b.ends_at) < now) return false
    return true
  })

  return res.json({ banners })
}
