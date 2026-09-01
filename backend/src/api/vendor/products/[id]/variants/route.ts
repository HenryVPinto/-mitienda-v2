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

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const {
    title,
    options,
    price_gtq,
    inventory_quantity,
    manage_inventory,
    color_hex,
  } = req.body as any

  if (!title) {
    return res.status(400).json({ message: "El título de la variante es requerido" })
  }

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const variantData: any = {
    product_id: id,
    title,
    inventory_quantity: inventory_quantity ?? 0,
    manage_inventory: manage_inventory ?? false,
  }

  if (options && typeof options === "object") {
    variantData.options = options
  }

  if (color_hex) {
    variantData.metadata = { color_hex }
  }

  const [variant] = await productModule.createProductVariants([variantData])

  if (price_gtq !== undefined && price_gtq !== null) {
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const [priceSet] = await pricingModule.createPriceSets([
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
      [Modules.PRODUCT]: { variant_id: variant.id },
      [Modules.PRICING]: { price_set_id: priceSet.id },
    })
  }

  return res.status(201).json({ variant })
}
