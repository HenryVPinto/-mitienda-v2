import { Module } from "@medusajs/framework/utils"
import ShippingRulesModuleService from "./service"

export const SHIPPING_RULES_MODULE = "shipping_rules"

export default Module(SHIPPING_RULES_MODULE, { service: ShippingRulesModuleService })
