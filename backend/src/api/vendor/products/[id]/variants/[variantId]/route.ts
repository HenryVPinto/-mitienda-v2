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

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id, variantId } = req.params
  const { price_gtq, inventory_quantity, manage_inventory, color_hex, images_urls } =
    req.body as any

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)

  const updateData: any = {}
  if (inventory_quantity !== undefined) updateData.inventory_quantity = inventory_quantity
  if (manage_inventory !== undefined) updateData.manage_inventory = manage_inventory

  // Merge metadata to avoid wiping color_hex when updating images_urls (or vice versa)
  if (color_hex !== undefined || images_urls !== undefined) {
    const [current] = await productModule.listProductVariants(
      { id: variantId },
      { select: ["id", "metadata"] }
    )
    const existingMeta = ((current as any)?.metadata as Record<string, unknown>) ?? {}
    updateData.metadata = { ...existingMeta }
    if (color_hex !== undefined) updateData.metadata.color_hex = color_hex
    if (images_urls !== undefined) updateData.metadata.images_urls = images_urls
  }

  const variant = await productModule.updateProductVariants(variantId, updateData)

  if (price_gtq !== undefined && price_gtq !== null) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

    const { data: variantData } = await query.graph({
      entity: "product_variant",
      fields: ["id", "price_set.id"],
      filters: { id: variantId },
    })

    const priceSetRaw = variantData[0]?.price_set
    const existingPriceSetId = Array.isArray(priceSetRaw)
      ? priceSetRaw[0]?.id
      : priceSetRaw?.id

    if (existingPriceSetId) {
      await remoteLink.dismiss({
        [Modules.PRODUCT]: { variant_id: variantId },
        [Modules.PRICING]: { price_set_id: existingPriceSetId },
      }).catch(() => {})
      await pricingModule.deletePriceSets([existingPriceSetId]).catch(() => {})
    }

    const [newPriceSet] = await pricingModule.createPriceSets([
      {
        prices: [{ amount: Number(price_gtq), currency_code: "gtq", rules: {} }],
      },
    ])

    await remoteLink.create({
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.PRICING]: { price_set_id: newPriceSet.id },
    })
  }

  return res.json({ variant })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id, variantId } = req.params

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  await productModule.deleteProductVariants([variantId])

  return res.json({ id: variantId, object: "product_variant", deleted: true })
}
