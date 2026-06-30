import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "thumbnail",
      "mt_brand.*",
      "mt_vendor.*",
      "mt_product_extension.*",
    ],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const product = products[0] as any

  return res.json({
    product: {
      id: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      brand: product.mt_brand ?? null,
      vendor: product.mt_vendor ?? null,
      extension: product.mt_product_extension ?? null,
    },
  })
}
