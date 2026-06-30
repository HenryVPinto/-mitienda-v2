import { model } from "@medusajs/framework/utils"

const MtProductExtension = model.define("MtProductExtension", {
  id: model.id({ prefix: "mtpex" }).primaryKey(),
  wholesale_price: model.number().nullable(),
  weight: model.number().nullable(),
  metadata: model.json().nullable(),
  description_html: model.text().nullable(),
})

export default MtProductExtension
