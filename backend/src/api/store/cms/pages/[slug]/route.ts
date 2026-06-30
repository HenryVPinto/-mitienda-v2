import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { slug } = req.params
  const service = req.scope.resolve(CMS_MODULE) as any

  const pages = await service.listMtPages({ slug, is_published: true })
  if (!pages.length) {
    return res.status(404).json({ message: "Page not found" })
  }

  return res.json({ page: pages[0] })
}
