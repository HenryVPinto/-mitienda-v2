import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

async function verifyOwnership(
  req: MedusaRequest,
  productId: string
): Promise<boolean> {
  const vendor = (req as any).vendor
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_vendor.id"],
    filters: { id: productId },
  })

  const product = products[0]
  if (!product) return false

  const vendorData = Array.isArray(product.mt_vendor)
    ? product.mt_vendor[0]
    : product.mt_vendor

  return vendorData?.id === vendor.vendor_id
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "description",
      "status",
      "thumbnail",
      "images.*",
      "options.*",
      "options.values.*",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.inventory_quantity",
      "variants.manage_inventory",
      "variants.metadata",
      "variants.prices.*",
      "variants.options.*",
      "mt_vendor.id",
      "mt_brand.id",
      "mt_brand.name",
      "mt_product_extension.wholesale_price",
      "mt_product_extension.weight",
      "mt_product_extension.description_html",
    ],
    filters: { id },
  })

  const product = products[0]
  if (!product) {
    return res.status(404).json({ message: "Producto no encontrado" })
  }

  const vendor = (req as any).vendor
  const vendorData = Array.isArray(product.mt_vendor)
    ? product.mt_vendor[0]
    : product.mt_vendor

  if (vendorData?.id !== vendor.vendor_id) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  return res.json({ product })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { title, description } = req.body as any

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)

  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description

  const [product] = await productModule.updateProducts([
    { id, ...updateData },
  ])

  return res.json({ product })
}
