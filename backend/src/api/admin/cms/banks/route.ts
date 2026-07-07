import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import CmsModuleService from "../../../../modules/cms/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  const [banks, count] = await cms.listAndCountMtBankAccounts(
    {},
    { order: { sort_order: "ASC" }, skip: Number(req.query.offset) || 0, take: Number(req.query.limit) || 50 }
  )
  res.json({ banks, count })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  const bank = await cms.createMtBankAccounts(req.body as any)
  res.status(201).json({ bank })
}
