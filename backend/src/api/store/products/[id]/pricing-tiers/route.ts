import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PROMOTION_ENGINE_MODULE } from "../../../../../modules/promotion-engine"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()
  const productId = req.params.id

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: productId },
  })

  const ruleIds = (products[0] as any)?.metadata?.promo_rule_ids as string[] ?? []

  if (!ruleIds.length) {
    return res.json({ tiers: [] })
  }

  const promoService: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)
  const rules = await promoService.listMtPromoRules({ id: ruleIds })

  const activeTiers = (rules as any[])
    .filter((r) => {
      if (!r.is_active) return false
      if (r.type !== "QUANTITY_DISCOUNT" && r.type !== "WHOLESALE") return false
      if (r.starts_at && new Date(r.starts_at) > now) return false
      if (r.ends_at && new Date(r.ends_at) < now) return false
      return true
    })
    .map((r) => ({
      rule_id: r.id,
      name: r.name,
      min_quantity: r.min_quantity ?? 1,
      discount_percentage: r.discount_percentage ?? 0,
    }))
    .sort((a, b) => a.min_quantity - b.min_quantity)

  res.json({ tiers: activeTiers })
}
