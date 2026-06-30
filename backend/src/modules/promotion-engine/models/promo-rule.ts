import { model } from "@medusajs/framework/utils"

const MtPromoRule = model.define("MtPromoRule", {
  id: model.id({ prefix: "mtpro" }).primaryKey(),
  name: model.text(),
  type: model.enum(["COMBO", "GIFT", "QUANTITY_DISCOUNT", "WHOLESALE"]),
  description: model.text().nullable(),
  is_active: model.boolean().default(true),
  starts_at: model.dateTime().nullable(),
  ends_at: model.dateTime().nullable(),
  min_quantity: model.number().nullable(),
  discount_percentage: model.number().nullable(),
  discount_amount: model.number().nullable(),
  gift_product_id: model.text().nullable(),
  gift_quantity: model.number().nullable(),
  metadata: model.json().nullable(),
})

export default MtPromoRule
