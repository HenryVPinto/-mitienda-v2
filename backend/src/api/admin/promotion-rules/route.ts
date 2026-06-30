import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PROMOTION_ENGINE_MODULE } from "../../../modules/promotion-engine"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)
  const { type, is_active } = req.query as any

  const filters: Record<string, unknown> = {}
  if (type) filters.type = type
  if (is_active !== undefined) filters.is_active = is_active === "true"

  const rules = await service.listMtPromoRules(filters, {
    order: { created_at: "DESC" },
  })

  return res.json({ promotion_rules: rules, count: rules.length })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const service: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)
  const body = req.body as any

  if (!body.name || !body.type) {
    return res.status(400).json({ message: "name and type are required" })
  }

  const rule = await service.createMtPromoRules(body)
  return res.status(201).json({ promotion_rule: rule })
}
