import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PROMOTION_ENGINE_MODULE } from "../../../../modules/promotion-engine"

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
  const promoService: any = req.scope.resolve(PROMOTION_ENGINE_MODULE)
  const now = new Date()

  const cartProductIds = items.map((i) => i.product_id)

  // Fetch metadata for all cart products in one query
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "metadata"],
    filters: { id: cartProductIds },
  })

  // Build map: productId -> metadata
  const productMetaMap: Record<string, any> = {}
  for (const product of products) {
    productMetaMap[(product as any).id] = (product as any).metadata ?? {}
  }

  // Collect all unique rule IDs across all cart items
  const allRuleIdsSet = new Set<string>()
  for (const item of items) {
    const ruleIds: string[] = productMetaMap[item.product_id]?.promo_rule_ids ?? []
    for (const id of ruleIds) {
      allRuleIdsSet.add(id)
    }
  }

  const allRuleIds = Array.from(allRuleIdsSet)

  if (!allRuleIds.length) {
    return res.json({
      applicable_promotions: [],
      total_savings: 0,
      policy: "best_applies",
    })
  }

  // Fetch all relevant rules at once
  const allRules: any[] = await promoService.listMtPromoRules({ id: allRuleIds })

  // Build active rules map filtered by date range
  const activeRulesMap: Record<string, any> = {}
  for (const rule of allRules) {
    if (!rule.is_active) continue
    if (rule.starts_at && new Date(rule.starts_at) > now) continue
    if (rule.ends_at && new Date(rule.ends_at) < now) continue
    activeRulesMap[rule.id] = rule
  }

  // Build productRulesMap: productId -> active rules[]
  const cartProductIdSet = new Set(cartProductIds)
  const productRulesMap: Record<string, any[]> = {}
  for (const item of items) {
    const ruleIds: string[] = productMetaMap[item.product_id]?.promo_rule_ids ?? []
    for (const ruleId of ruleIds) {
      const rule = activeRulesMap[ruleId]
      if (!rule) continue
      if (!productRulesMap[item.product_id]) productRulesMap[item.product_id] = []
      productRulesMap[item.product_id].push(rule)
    }
  }

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
        // Get all products linked to this combo rule via their metadata
        // Collect all product IDs that have this rule in their promo_rule_ids
        const comboProductIds: string[] = []
        for (const [pid, meta] of Object.entries(productMetaMap)) {
          const ruleIds: string[] = (meta as any)?.promo_rule_ids ?? []
          if (ruleIds.includes(rule.id) && cartProductIdSet.has(pid)) {
            comboProductIds.push(pid)
          }
        }

        const allPresent = comboProductIds.every((pid) => cartProductIdSet.has(pid))
        if (!allPresent || comboProductIds.length === 0) continue

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
