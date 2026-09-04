import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // query.graph returns all categories (both parent and children) without depth restrictions
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "parent_category_id"],
    pagination: { take: 300 },
  })

  return res.json({ categories })
}
