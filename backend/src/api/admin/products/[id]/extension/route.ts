import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PRODUCT_EXTENSION_MODULE } from "../../../../../modules/product-extension"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_product_extension.*"],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const extension = (products[0] as any).mt_product_extension ?? null
  return res.json({ extension })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { wholesale_price, weight, metadata, description_html } = req.body as any

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const extensionService: any = req.scope.resolve(PRODUCT_EXTENSION_MODULE)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_product_extension.*"],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const existingExtension = (products[0] as any).mt_product_extension

  let extension: any

  if (existingExtension?.id) {
    extension = await extensionService.updateMtProductExtensions(
      { id: existingExtension.id },
      { wholesale_price, weight, metadata, description_html }
    )
  } else {
    extension = await extensionService.createMtProductExtensions({
      wholesale_price,
      weight,
      metadata,
      description_html,
    })

    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: id },
      [PRODUCT_EXTENSION_MODULE]: { mt_product_extension_id: extension.id },
    })
  }

  return res.json({ extension })
}
