import { model } from "@medusajs/framework/utils"

const MtBanner = model
  .define("MtBanner", {
    id: model.id({ prefix: "mtbnr" }).primaryKey(),
    title: model.text(),
    subtitle: model.text().nullable(),
    image_url: model.text(),
    link_url: model.text().nullable(),
    position: model.enum(["HOME", "CATEGORY", "PROMO"]).default("HOME"),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
    starts_at: model.dateTime().nullable(),
    ends_at: model.dateTime().nullable(),
  })

export default MtBanner
