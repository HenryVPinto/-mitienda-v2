import { model } from "@medusajs/framework/utils"

const MtShippingRule = model.define("MtShippingRule", {
  id: model.id({ prefix: "mtshr" }).primaryKey(),
  name: model.text(),
  description: model.text().nullable(),
  region_code: model.text().nullable(),
  min_order_amount: model.number().nullable(),
  max_order_amount: model.number().nullable(),
  flat_rate: model.number().nullable(),
  free_above_amount: model.number().nullable(),
  // Tarifa por peso: aplica cuando el total de items >= min_item_quantity Y el peso total supera weight_threshold_lbs
  weight_threshold_lbs: model.number().nullable(),
  rate_per_lb: model.number().nullable(),
  min_item_quantity: model.number().nullable(),
  is_active: model.boolean().default(true),
  priority: model.number().default(0),
  metadata: model.json().nullable(),
})

export default MtShippingRule
