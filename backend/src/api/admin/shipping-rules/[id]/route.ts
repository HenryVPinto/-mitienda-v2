import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SHIPPING_RULES_MODULE } from "../../../../modules/shipping-rules"
import ShippingRulesModuleService from "../../../../modules/shipping-rules/service"
import { UpdateShippingRuleInput } from "../../../../modules/shipping-rules/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const shippingRulesService =
    req.scope.resolve<ShippingRulesModuleService>(SHIPPING_RULES_MODULE)
  const shippingRule = await shippingRulesService.retrieveMtShippingRule(
    req.params.id
  )
  res.json({ shipping_rule: shippingRule })
}

export const PATCH = async (
  req: MedusaRequest<UpdateShippingRuleInput>,
  res: MedusaResponse
) => {
  const shippingRulesService =
    req.scope.resolve<ShippingRulesModuleService>(SHIPPING_RULES_MODULE)
  const [shippingRule] = await shippingRulesService.updateMtShippingRules({
    selector: { id: req.params.id },
    data: req.body,
  })
  res.json({ shipping_rule: shippingRule })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const shippingRulesService =
    req.scope.resolve<ShippingRulesModuleService>(SHIPPING_RULES_MODULE)
  await shippingRulesService.deleteMtShippingRules([req.params.id])
  res.json({ id: req.params.id, object: "shipping_rule", deleted: true })
}
