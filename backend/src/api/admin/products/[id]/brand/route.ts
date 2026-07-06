import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { BRAND_MODULE } from "../../../../../modules/brand"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_brand.*"],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const brand = (products[0] as any).mt_brand ?? null
  return res.json({ brand })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { brand_id } = req.body as any

  if (!brand_id) {
    return res.status(400).json({ message: "brand_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Get current brand to dismiss by ID
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_brand.*"],
    filters: { id },
  })
  const currentBrand = (products[0] as any)?.mt_brand
  if (currentBrand?.id) {
    await remoteLink.dismiss({
      [Modules.PRODUCT]: { product_id: id },
      [BRAND_MODULE]: { mt_brand_id: currentBrand.id },
    }).catch(() => {})
  }

  await remoteLink.create({
    [Modules.PRODUCT]: { product_id: id },
    [BRAND_MODULE]: { mt_brand_id: brand_id },
  })

  return res.json({ success: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_brand.*"],
    filters: { id },
  })

  const brand = (products[0] as any)?.mt_brand
  if (!brand?.id) {
    return res.json({ success: true })
  }

  await remoteLink.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [BRAND_MODULE]: { mt_brand_id: brand.id },
  })

  return res.json({ success: true })
}
