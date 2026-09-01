import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../modules/vendor"
import { BRAND_MODULE } from "../../../modules/brand"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: vendors } = await query.graph({
    entity: "mt_vendor",
    fields: [
      "id",
      "product.id",
      "product.title",
      "product.handle",
      "product.status",
      "product.thumbnail",
      "product.variants.id",
      "product.variants.prices.*",
    ],
    filters: { id: vendor.vendor_id },
  })

  const products = vendors[0]?.product ?? []
  return res.json({ products })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const { title, description, category_id, brand_id } = req.body as any

  if (!title) {
    return res.status(400).json({ message: "Título es requerido" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const productData: any = {
    title,
    status: "draft",
  }
  if (description) productData.description = description
  if (category_id) productData.categories = [{ id: category_id }]

  const [product] = await productModule.createProducts([productData])

  await remoteLink.create({
    [Modules.PRODUCT]: { product_id: product.id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor.vendor_id },
  })

  if (brand_id) {
    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [BRAND_MODULE]: { mt_brand_id: brand_id },
    }).catch(() => {})
  }

  return res.status(201).json({ product })
}
