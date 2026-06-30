import { model } from "@medusajs/framework/utils"

const MtFaqItem = model.define("MtFaqItem", {
  id: model.id({ prefix: "mtfaq" }).primaryKey(),
  question: model.text(),
  answer: model.text(),
  category: model.text().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default MtFaqItem
