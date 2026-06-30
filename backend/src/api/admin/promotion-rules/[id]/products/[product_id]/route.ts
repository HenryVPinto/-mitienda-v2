import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PROMOTION_ENGINE_MODULE } from "../../../../../../modules/promotion-engine"

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id, product_id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  await remoteLink.dismiss({
    [Modules.PRODUCT]: { product_id },
    [PROMOTION_ENGINE_MODULE]: { mt_promo_rule_id: id },
  })

  return res.json({ success: true })
}
