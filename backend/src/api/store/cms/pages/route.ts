import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const pages = await service.listMtPages({ is_published: true })
  return res.json({ pages })
}
