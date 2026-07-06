import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_promo_rule.*"],
    filters: { id: req.params.id },
  })

  if (!products.length) {
    return res.json({ tiers: [] })
  }

  console.log(`[pricing-tiers] full product object keys:`, Object.keys(products[0] as any))
  console.log(`[pricing-tiers] full product:`, JSON.stringify(products[0]))

  const raw = (products[0] as any).mt_promo_rule
  const rules = Array.isArray(raw) ? raw : raw ? [raw] : []

  console.log(`[pricing-tiers] product=${req.params.id} rules_found=${rules.length}`, JSON.stringify(rules))

  const activeTiers = rules
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
