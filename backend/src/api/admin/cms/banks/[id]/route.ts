import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../../modules/cms"
import CmsModuleService from "../../../../../modules/cms/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  const bank = await cms.retrieveMtBankAccount(req.params.id)
  res.json({ bank })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  const [bank] = await cms.updateMtBankAccounts({
    selector: { id: req.params.id },
    data: req.body as any,
  })
  res.json({ bank })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  await cms.deleteMtBankAccounts([req.params.id])
  res.json({ id: req.params.id, object: "bank_account", deleted: true })
}
