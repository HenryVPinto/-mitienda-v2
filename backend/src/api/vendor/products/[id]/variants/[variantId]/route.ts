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
  const { price_gtq, inventory_quantity, manage_inventory, color_hex } =
    req.body as any

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)

  const updateData: any = {}
  if (inventory_quantity !== undefined) {
    updateData.inventory_quantity = inventory_quantity
  }
  if (manage_inventory !== undefined) {
    updateData.manage_inventory = manage_inventory
  }
  if (color_hex !== undefined) {
    updateData.metadata = { color_hex }
  }

  const [variant] = await productModule.updateProductVariants([
    { id: variantId, ...updateData },
  ])

  if (price_gtq !== undefined && price_gtq !== null) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const pricingModule = req.scope.resolve(Modules.PRICING)

    const { data: variants } = await query.graph({
      entity: "product_variant",
      fields: ["id", "prices.*"],
      filters: { id: variantId },
    })

    const variantWithPrices = variants[0]
    const prices = variantWithPrices?.prices ?? []
    const gtqPrice = prices.find(
      (p: any) => p.currency_code === "gtq" && !p.price_list_id
    )

    if (gtqPrice) {
      // Obtener el price_set_id vinculado a esta variante
      const { data: priceSets } = await query.graph({
        entity: "product_variant",
        fields: ["id", "price_set.id", "price_set.prices.*"],
        filters: { id: variantId },
      })

      const priceSet = priceSets[0]?.price_set
      const priceSetId = Array.isArray(priceSet) ? priceSet[0]?.id : priceSet?.id

      if (priceSetId) {
        const existingPrices = Array.isArray(priceSet)
          ? priceSet[0]?.prices ?? []
          : priceSet?.prices ?? []

        const oldGtqPrice = existingPrices.find(
          (p: any) => p.currency_code === "gtq" && !p.price_list_id
        )

        if (oldGtqPrice) {
          await pricingModule.deletePrices([oldGtqPrice.id])
        }

        await pricingModule.addPrices([
          {
            priceSetId,
            prices: [
              {
                amount: Number(price_gtq),
                currency_code: "gtq",
                rules: {},
              },
            ],
          },
        ])
      } else {
        // No tiene price_set aún, crear uno nuevo y vincular
        const remoteLink = req.scope.resolve(
          ContainerRegistrationKeys.REMOTE_LINK
        )
        const [newPriceSet] = await pricingModule.createPriceSets([
          {
            prices: [
              {
                amount: Number(price_gtq),
                currency_code: "gtq",
                rules: {},
              },
            ],
          },
        ])
        await remoteLink.create({
          [Modules.PRODUCT]: { variant_id: variantId },
          [Modules.PRICING]: { price_set_id: newPriceSet.id },
        })
      }
    } else {
      // No hay precio GTQ aún — buscar price_set o crear
      const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
      const { data: priceSets } = await query.graph({
        entity: "product_variant",
        fields: ["id", "price_set.id"],
        filters: { id: variantId },
      })

      const priceSet = priceSets[0]?.price_set
      const priceSetId = Array.isArray(priceSet) ? priceSet[0]?.id : priceSet?.id

      if (priceSetId) {
        await pricingModule.addPrices([
          {
            priceSetId,
            prices: [
              {
                amount: Number(price_gtq),
                currency_code: "gtq",
                rules: {},
              },
            ],
          },
        ])
      } else {
        const [newPriceSet] = await pricingModule.createPriceSets([
          {
            prices: [
              {
                amount: Number(price_gtq),
                currency_code: "gtq",
                rules: {},
              },
            ],
          },
        ])
        await remoteLink.create({
          [Modules.PRODUCT]: { variant_id: variantId },
          [Modules.PRICING]: { price_set_id: newPriceSet.id },
        })
      }
    }
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
