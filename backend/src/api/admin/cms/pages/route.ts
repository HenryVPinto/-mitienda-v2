import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const pages = await service.listMtPages({}, { order: { title: "ASC" } })
  return res.json({ pages })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service = req.scope.resolve(CMS_MODULE) as any
  const page = await service.createMtPages(req.body)
  return res.status(201).json({ page })
}
