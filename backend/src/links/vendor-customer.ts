import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import VendorModule from "../modules/vendor"

export default defineLink(
  VendorModule.linkable.mtVendor,
  { linkable: CustomerModule.linkable.customer, isList: false }
)
