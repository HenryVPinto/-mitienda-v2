import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PROMOTION_ENGINE_MODULE } from "../../../../../modules/promotion-engine"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: rules } = await query.graph({
    entity: "mt_promo_rule",
    fields: ["id", "product.*"],
    filters: { id },
  })

  if (!rules.length) {
    return res.status(404).json({ message: "Promotion rule not found" })
  }

  const raw = (rules[0] as any).product
  const products = Array.isArray(raw) ? raw : raw ? [raw] : []
  return res.json({ products })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { product_id } = req.body as any

  if (!product_id) {
    return res.status(400).json({ message: "product_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  console.log(`[promo-link/POST] rule_id=${id} product_id=${product_id}`)

  const dismissResult = await remoteLink.dismiss({
    [Modules.PRODUCT]: { product_id },
    [PROMOTION_ENGINE_MODULE]: { mt_promo_rule_id: id },
  }).catch((e: any) => { console.log(`[promo-link/POST] dismiss error:`, e?.message); return null })

  console.log(`[promo-link/POST] dismiss result:`, JSON.stringify(dismissResult))

  try {
    const createResult = await remoteLink.create({
      [Modules.PRODUCT]: { product_id },
      [PROMOTION_ENGINE_MODULE]: { mt_promo_rule_id: id },
    })
    console.log(`[promo-link/POST] create result:`, JSON.stringify(createResult))
  } catch (e: any) {
    console.log(`[promo-link/POST] create error:`, e?.message)
    return res.status(500).json({ message: e?.message ?? "Error creating link" })
  }

  return res.json({ success: true })
}
