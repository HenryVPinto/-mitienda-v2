import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const productModule = req.scope.resolve(Modules.PRODUCT)

  const categories = await productModule.listProductCategories(
    {},
    { select: ["id", "name", "parent_category_id"] }
  )

  return res.json({ categories })
}
