import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CMS_MODULE } from "../../../../modules/cms"
import CmsModuleService from "../../../../modules/cms/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const cms = req.scope.resolve<CmsModuleService>(CMS_MODULE)
  const [banks] = await cms.listAndCountMtBankAccounts(
    { is_active: true },
    { order: { sort_order: "ASC" } }
  )
  res.json({ banks })
}
