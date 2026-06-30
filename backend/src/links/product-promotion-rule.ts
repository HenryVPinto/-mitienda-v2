import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PromotionEngineModule from "../modules/promotion-engine"

export default defineLink(
  ProductModule.linkable.product,
  PromotionEngineModule.linkable.mtPromoRule
)
