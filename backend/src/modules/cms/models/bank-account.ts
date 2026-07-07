import { model } from "@medusajs/framework/utils"

const MtBankAccount = model.define("MtBankAccount", {
  id: model.id({ prefix: "mtbank" }).primaryKey(),
  bank_name: model.text(),
  account_number: model.text(),
  account_type: model.text(),
  account_holder: model.text(),
  logo_url: model.text().nullable(),
  instructions: model.text().nullable(),
  is_active: model.boolean().default(true),
  sort_order: model.number().default(0),
})

export default MtBankAccount
