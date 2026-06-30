import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_RULES_MODULE } from "../../../modules/shipping-rules"
import ShippingRulesModuleService from "../../../modules/shipping-rules/service"
import { CreateShippingRuleInput } from "../../../modules/shipping-rules/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const shippingRulesService =
    req.scope.resolve<ShippingRulesModuleService>(SHIPPING_RULES_MODULE)
  const [shippingRules, count] =
    await shippingRulesService.listAndCountMtShippingRules(
      {},
      {
        skip: Number(req.query.offset) || 0,
        take: Number(req.query.limit) || 50,
      }
    )
  res.json({ shipping_rules: shippingRules, count })
}

export const POST = async (
  req: MedusaRequest<CreateShippingRuleInput>,
  res: MedusaResponse
) => {
  const shippingRulesService =
    req.scope.resolve<ShippingRulesModuleService>(SHIPPING_RULES_MODULE)
  const shippingRule = await shippingRulesService.createMtShippingRules(
    req.body
  )
  res.status(201).json({ shipping_rule: shippingRule })
}
