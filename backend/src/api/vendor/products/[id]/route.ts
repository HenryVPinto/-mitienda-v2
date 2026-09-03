import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../modules/brand"
import { PRODUCT_EXTENSION_MODULE } from "../../../../modules/product-extension"

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
      "categories.id",
      "categories.name",
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
      "mt_product_extension.id",
      "mt_product_extension.wholesale_price",
      "mt_product_extension.weight",
      "mt_product_extension.description_html",
      "metadata",
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
  const {
    title, description, thumbnail, images,
    brand_id, category_id,
    weight, description_html,
    promo_rule_ids,
  } = req.body as any

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Basic product fields
  const updateData: any = {}
  if (title !== undefined) updateData.title = title
  if (description !== undefined) updateData.description = description
  if (thumbnail !== undefined) updateData.thumbnail = thumbnail
  if (images !== undefined) updateData.images = images
  if (category_id !== undefined) {
    updateData.categories = category_id ? [{ id: category_id }] : []
  }

  // Merge promo_rule_ids into existing metadata
  if (promo_rule_ids !== undefined) {
    const { data: pData } = await query.graph({
      entity: "product",
      fields: ["id", "metadata"],
      filters: { id },
    })
    const existingMeta = ((pData[0] as any)?.metadata as Record<string, unknown>) ?? {}
    updateData.metadata = { ...existingMeta, promo_rule_ids }
  }

  if (Object.keys(updateData).length > 0) {
    await productModule.updateProducts(id, updateData)
  }

  // Brand link
  if (brand_id !== undefined) {
    const { data: pData } = await query.graph({
      entity: "product",
      fields: ["id", "mt_brand.id"],
      filters: { id },
    })
    const cur = pData[0] as any
    const curBrand = Array.isArray(cur?.mt_brand) ? cur.mt_brand[0] : cur?.mt_brand
    if (curBrand?.id) {
      await remoteLink.dismiss({
        [Modules.PRODUCT]: { product_id: id },
        [BRAND_MODULE]: { mt_brand_id: curBrand.id },
      }).catch(() => {})
    }
    if (brand_id) {
      await remoteLink.create({
        [Modules.PRODUCT]: { product_id: id },
        [BRAND_MODULE]: { mt_brand_id: brand_id },
      })
    }
  }

  // Product extension: weight + description_html
  if (weight !== undefined || description_html !== undefined) {
    const extensionService: any = req.scope.resolve(PRODUCT_EXTENSION_MODULE)
    const { data: pData } = await query.graph({
      entity: "product",
      fields: ["id", "mt_product_extension.id", "mt_product_extension.weight", "mt_product_extension.description_html"],
      filters: { id },
    })
    const cur = pData[0] as any
    const ext = Array.isArray(cur?.mt_product_extension)
      ? cur.mt_product_extension[0]
      : cur?.mt_product_extension

    const extUpdate: any = {}
    if (weight !== undefined) extUpdate.weight = weight
    if (description_html !== undefined) extUpdate.description_html = description_html

    if (ext?.id) {
      await extensionService.updateMtProductExtensions([{ id: ext.id, ...extUpdate }])
    } else {
      const newExt = await extensionService.createMtProductExtensions(extUpdate)
      await remoteLink.create({
        [Modules.PRODUCT]: { product_id: id },
        [PRODUCT_EXTENSION_MODULE]: { mt_product_extension_id: newExt.id },
      })
    }
  }

  return res.json({ success: true })
}
