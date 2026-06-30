import { Module } from "@medusajs/framework/utils"
import PromotionEngineModuleService from "./service"

export const PROMOTION_ENGINE_MODULE = "promotion_engine"

export default Module(PROMOTION_ENGINE_MODULE, {
  service: PromotionEngineModuleService,
})
