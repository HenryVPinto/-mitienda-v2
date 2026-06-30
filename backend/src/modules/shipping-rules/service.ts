import { MedusaService } from "@medusajs/framework/utils"
import MtShippingRule from "./models/shipping-rule"

class ShippingRulesModuleService extends MedusaService({ MtShippingRule }) {}

export default ShippingRulesModuleService
