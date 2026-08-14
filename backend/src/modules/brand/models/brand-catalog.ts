import { model } from "@medusajs/framework/utils"

const MtBrandCatalog = model
  .define("MtBrandCatalog", {
    id: model.id({ prefix: "mtcat" }).primaryKey(),
    brand_id: model.text(),
    title: model.text(),
    description: model.text().nullable(),
    file_url: model.text(),
    cover_image_url: model.text().nullable(),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
  })
  .indexes([{ on: ["brand_id"] }])

export default MtBrandCatalog
