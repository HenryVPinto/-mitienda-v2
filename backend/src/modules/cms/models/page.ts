import { model } from "@medusajs/framework/utils"

const MtPage = model
  .define("MtPage", {
    id: model.id({ prefix: "mtpag" }).primaryKey(),
    slug: model.text(),
    title: model.text(),
    content: model.text(),
    is_published: model.boolean().default(false),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["slug"], unique: true, where: "deleted_at IS NULL" }])

export default MtPage
