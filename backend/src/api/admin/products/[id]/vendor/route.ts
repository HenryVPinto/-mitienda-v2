import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const vendor = (products[0] as any).mt_vendor ?? null
  return res.json({ vendor })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { vendor_id } = req.body as any

  if (!vendor_id) {
    return res.status(400).json({ message: "vendor_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Consultar la tabla de links directamente para obtener el mt_vendor_id actual,
  // incluso si el registro del vendor fue borrado y query.graph devuelve null.
  const { data: existingLinks } = await query.graph({
    entity: "product_mt_vendor",
    fields: ["product_id", "mt_vendor_id"],
    filters: { product_id: id },
  })

  for (const link of existingLinks as any[]) {
    await remoteLink.dismiss({
      [Modules.PRODUCT]: { product_id: id },
      [VENDOR_MODULE]: { mt_vendor_id: link.mt_vendor_id },
    }).catch((e: unknown) => console.warn("[vendor/POST] dismiss error:", e))
  }

  try {
    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: id },
      [VENDOR_MODULE]: { mt_vendor_id: vendor_id },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[vendor/POST] create error:", msg)
    return res.status(500).json({ message: msg })
  }

  return res.json({ success: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  const vendor = (products[0] as any)?.mt_vendor
  if (!vendor?.id) {
    return res.json({ success: true })
  }

  await remoteLink.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor.id },
  })

  return res.json({ success: true })
}
