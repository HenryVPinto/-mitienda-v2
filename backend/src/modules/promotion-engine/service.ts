import { MedusaService } from "@medusajs/framework/utils"
import MtPromoRule from "./models/promo-rule"

class PromotionEngineModuleService extends MedusaService({
  MtPromoRule,
}) {}

export default PromotionEngineModuleService
