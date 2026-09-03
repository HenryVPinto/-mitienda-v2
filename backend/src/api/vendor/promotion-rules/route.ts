import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTION_ENGINE_MODULE } from "../../../modules/promotion-engine"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const promoService: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)

  const now = new Date()

  const allRules = await promoService.listMtPromoRules(
    { is_active: true },
    { select: ["id", "name", "type", "description", "min_quantity", "discount_percentage", "discount_amount", "starts_at", "ends_at"] }
  )

  const rules = (allRules as any[]).filter((r) => {
    if (r.type !== "WHOLESALE" && r.type !== "QUANTITY_DISCOUNT") return false
    if (r.starts_at && new Date(r.starts_at) > now) return false
    if (r.ends_at && new Date(r.ends_at) < now) return false
    return true
  })

  return res.json({ rules })
}
