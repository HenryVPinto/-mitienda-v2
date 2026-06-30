import { model } from "@medusajs/framework/utils"

const MtBrand = model
  .define("MtBrand", {
    id: model.id({ prefix: "mtbrd" }).primaryKey(),
    name: model.text(),
    handle: model.text(),
    description: model.text().nullable(),
    logo_url: model.text().nullable(),
    website_url: model.text().nullable(),
    is_active: model.boolean().default(true),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["handle"], unique: true, where: "deleted_at IS NULL" }])

export default MtBrand
