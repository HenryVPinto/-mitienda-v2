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

  const raw = (products[0] as any).mt_promo_rule
  const rules = Array.isArray(raw) ? raw : raw ? [raw] : []

  const activeTiers = rules
    .filter((r: any) => {
      if (!r.is_active) return false
      if (r.type !== "QUANTITY_DISCOUNT") return false
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
