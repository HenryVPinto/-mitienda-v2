import { model } from "@medusajs/framework/utils"

const MtVendor = model
  .define("MtVendor", {
    id: model.id({ prefix: "mtvnd" }).primaryKey(),
    name: model.text(),
    handle: model.text(),
    description: model.text().nullable(),
    logo_url: model.text().nullable(),
    contact_email: model.text().nullable(),
    contact_phone: model.text().nullable(),
    address: model.text().nullable(),
    city: model.text().nullable(),
    country_code: model.text().default("GT"),
    is_active: model.boolean().default(true),
    commission_rate: model.number().nullable(),
    metadata: model.json().nullable(),
  })
  .indexes([{ on: ["handle"], unique: true, where: "deleted_at IS NULL" }])

export default MtVendor
