import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()
  const productId = req.params.id

  // Medusa's graph can't traverse product→mt_promo_rule, but CAN go mt_promo_rule→product.
  // So we fetch all rules with their linked product IDs and filter client-side.
  const { data: allRules } = await query.graph({
    entity: "mt_promo_rule",
    fields: [
      "id", "name", "type", "is_active",
      "starts_at", "ends_at",
      "min_quantity", "discount_percentage",
      "product.id",
    ],
  })

  const linkedRules = allRules.filter((r: any) => {
    const products = Array.isArray(r.product) ? r.product : r.product ? [r.product] : []
    return products.some((p: any) => p.id === productId)
  })

  const activeTiers = linkedRules
    .filter((r: any) => {
      if (!r.is_active) return false
      if (r.type !== "QUANTITY_DISCOUNT" && r.type !== "WHOLESALE") return false
      if (r.starts_at && new Date(r.starts_at) > now) return false
      if (r.ends_at && new Date(r.ends_at) < now) return false
      return true
    })
    .map((r: any) => ({
      rule_id: r.id,
      name: r.name,
      min_quantity: r.min_quantity ?? 1,
      discount_percentage: r.discount_percentage ?? 0,
    }))
    .sort((a: any, b: any) => a.min_quantity - b.min_quantity)

  res.json({ tiers: activeTiers })
}
