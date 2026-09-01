import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { createProductVariantsWorkflow } from "@medusajs/medusa/core-flows"

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

  // Build variant input — options as { optionTitle: value } object for the workflow
  // options arrives as [{ option_id, value }] from the frontend
  const optionsMap: Record<string, string> = {}
  if (Array.isArray(options)) {
    // Fetch option titles via query.graph so the workflow can match them by title
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: productData } = await query.graph({
      entity: "product",
      fields: ["options.id", "options.title"],
      filters: { id },
    })
    const productOptions: Array<{ id: string; title: string }> =
      (productData[0] as any)?.options ?? []
    for (const { option_id, value } of options) {
      const opt = productOptions.find((o) => o.id === option_id)
      if (opt) optionsMap[opt.title] = value
    }
  }

  const variantInput: any = {
    title,
    inventory_quantity: inventory_quantity ?? 0,
    manage_inventory: manage_inventory ?? false,
  }

  if (Object.keys(optionsMap).length > 0) {
    variantInput.options = optionsMap
  }

  if (color_hex) {
    variantInput.metadata = { color_hex }
  }

  const { result } = await createProductVariantsWorkflow(req.scope).run({
    input: {
      product_id: id,
      variants: [variantInput],
    } as any,
  })

  const variant = result[0]

  if (price_gtq !== undefined && price_gtq !== null) {
    const pricingModule = req.scope.resolve(Modules.PRICING)
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

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
