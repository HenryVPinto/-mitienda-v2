import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
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

  // Convert [{ option_id, value }] → { "OptionTitle": "value" } for the workflow
  const optionsMap: Record<string, string> = {}
  if (Array.isArray(options) && options.length > 0) {
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
    product_id: id,
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

  // Pass price directly to the workflow (it handles price set + link internally)
  if (price_gtq !== undefined && price_gtq !== null) {
    variantInput.prices = [{ amount: Number(price_gtq), currency_code: "gtq" }]
  }

  try {
    const { result } = await createProductVariantsWorkflow(req.scope).run({
      input: { product_variants: [variantInput] } as any,
    })

    return res.status(201).json({ variant: result[0] })
  } catch (err: any) {
    return res.status(500).json({ message: err.message ?? "Error al crear variante" })
  }
}
