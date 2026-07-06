import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PromotionEngineModule from "../modules/promotion-engine"

// isList en ambos lados: un producto puede tener múltiples reglas
// y una regla puede aplicarse a múltiples productos (many-to-many)
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  { linkable: PromotionEngineModule.linkable.mtPromoRule, isList: true }
)
