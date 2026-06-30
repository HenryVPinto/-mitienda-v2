import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import VendorModule from "../modules/vendor"

export default defineLink(
  OrderModule.linkable.order,
  VendorModule.linkable.mtVendor
)
