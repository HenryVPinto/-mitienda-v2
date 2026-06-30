import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

type CartItem = {
  product_id: string
  quantity: number
  unit_price: number
}

type AppliedPromotion = {
  rule_id: string
  rule_name: string
  type: string
  applied_to: string[]
  discount_percentage?: number
  discount_amount?: number
  gift_product_id?: string
  gift_quantity?: number
  savings: number
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { items } = req.body as { items: CartItem[] }

  if (!items?.length) {
    return res.status(400).json({ message: "items is required" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const now = new Date()

  // Get linked promo rules for each product in the cart
  const productRulesMap: Record<string, any[]> = {}

  for (const item of items) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "mt_promo_rule.*"],
      filters: { id: item.product_id },
    })

    if (products.length) {
      const raw = (products[0] as any).mt_promo_rule
      const asArray = Array.isArray(raw) ? raw : raw ? [raw] : []
      productRulesMap[item.product_id] = asArray.filter((r: any) => {
        if (!r.is_active) return false
        if (r.starts_at && new Date(r.starts_at) > now) return false
        if (r.ends_at && new Date(r.ends_at) < now) return false
        return true
      })
    } else {
      productRulesMap[item.product_id] = []
    }
  }

  const cartProductIds = new Set(items.map((i) => i.product_id))
  const applicable: AppliedPromotion[] = []
  const processedComboIds = new Set<string>()

  for (const item of items) {
    const rules = productRulesMap[item.product_id] ?? []

    for (const rule of rules) {
      if (rule.type === "QUANTITY_DISCOUNT") {
        if (rule.min_quantity && item.quantity < rule.min_quantity) continue
        const savings = rule.discount_percentage
          ? Math.round(item.unit_price * item.quantity * (rule.discount_percentage / 100))
          : 0

        applicable.push({
          rule_id: rule.id,
          rule_name: rule.name,
          type: "QUANTITY_DISCOUNT",
          applied_to: [item.product_id],
          discount_percentage: rule.discount_percentage ?? undefined,
          savings,
        })
      }

      if (rule.type === "WHOLESALE") {
        if (rule.min_quantity && item.quantity < rule.min_quantity) continue
        applicable.push({
          rule_id: rule.id,
          rule_name: rule.name,
          type: "WHOLESALE",
          applied_to: [item.product_id],
          savings: 0,
        })
      }

      if (rule.type === "GIFT" && rule.gift_product_id) {
        applicable.push({
          rule_id: rule.id,
          rule_name: rule.name,
          type: "GIFT",
          applied_to: [item.product_id],
          gift_product_id: rule.gift_product_id,
          gift_quantity: rule.gift_quantity ?? 1,
          savings: 0,
        })
      }

      if (rule.type === "COMBO" && !processedComboIds.has(rule.id)) {
        // Get all products linked to this combo rule
        const { data: comboRules } = await query.graph({
          entity: "mt_promo_rule",
          fields: ["id", "product.id"],
          filters: { id: rule.id },
        })

        const comboProductIds: string[] =
          ((comboRules[0] as any)?.product ?? []).map((p: any) => p.id)

        const allPresent = comboProductIds.every((pid) => cartProductIds.has(pid))
        if (!allPresent) continue

        const comboSubtotal = comboProductIds.reduce((sum, pid) => {
          const it = items.find((i) => i.product_id === pid)
          return sum + (it ? it.unit_price * it.quantity : 0)
        }, 0)

        const savings = rule.discount_percentage
          ? Math.round(comboSubtotal * (rule.discount_percentage / 100))
          : (rule.discount_amount ?? 0)

        applicable.push({
          rule_id: rule.id,
          rule_name: rule.name,
          type: "COMBO",
          applied_to: comboProductIds,
          discount_percentage: rule.discount_percentage ?? undefined,
          discount_amount: rule.discount_amount ?? undefined,
          savings,
        })

        processedComboIds.add(rule.id)
      }
    }
  }

  // Policy: best_applies — for the same product keep only the highest savings
  const bestByProduct: Record<string, AppliedPromotion> = {}
  const nonProductSpecific: AppliedPromotion[] = []

  for (const promo of applicable) {
    if (promo.type === "GIFT" || promo.type === "COMBO") {
      nonProductSpecific.push(promo)
      continue
    }
    for (const pid of promo.applied_to) {
      if (!bestByProduct[pid] || promo.savings > bestByProduct[pid].savings) {
        bestByProduct[pid] = promo
      }
    }
  }

  const finalPromos = [...Object.values(bestByProduct), ...nonProductSpecific]
  const totalSavings = finalPromos.reduce((sum, p) => sum + p.savings, 0)

  return res.json({
    applicable_promotions: finalPromos,
    total_savings: totalSavings,
    policy: "best_applies",
  })
}
