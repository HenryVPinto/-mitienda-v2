import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTION_ENGINE_MODULE } from "../../../../modules/promotion-engine"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)

  try {
    const rule = await service.retrieveMtPromoRule(id)
    return res.json({ promotion_rule: rule })
  } catch {
    return res.status(404).json({ message: "Promotion rule not found" })
  }
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)

  const [rule] = await service.updateMtPromoRules([{ id, ...(req.body as Record<string, any>) }])
  return res.json({ promotion_rule: rule })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const service: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)

  await service.deleteMtPromoRules({ id })
  return res.json({ success: true })
}
