import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BrandModule from "../modules/brand"

// isList en producto: una marca puede asignarse a múltiples productos
export default defineLink(
  { linkable: ProductModule.linkable.product, isList: true },
  BrandModule.linkable.mtBrand
)
