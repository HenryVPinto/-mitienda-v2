import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../modules/vendor"
import { BRAND_MODULE } from "../../../modules/brand"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Query from product side (includes drafts) — mt_vendor→product traversal
  // skips drafts due to Medusa's default published-only scope on that direction.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "variants.id",
      "variants.prices.*",
      "mt_vendor.id",
    ],
    pagination: { take: 500 },
  })

  const products = allProducts.filter((p: any) => {
    const v = Array.isArray(p.mt_vendor) ? p.mt_vendor[0] : p.mt_vendor
    return v?.id === vendor.vendor_id
  })

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
