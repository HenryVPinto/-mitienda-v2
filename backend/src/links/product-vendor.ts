import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import VendorModule from "../modules/vendor"

export default defineLink(
  ProductModule.linkable.product,
  VendorModule.linkable.mtVendor
)
