import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import ProductVendorLink from "../../../../../links/product-vendor"

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

  // Acceder al servicio del link directamente usando su serviceKey para poder
  // listar y eliminar links huérfanos (donde el vendor fue borrado y query.graph
  // no los devuelve por el JOIN, pero sí bloquean el create).
  const linkServiceKey = (ProductVendorLink as any).serviceKey as string | undefined
  console.log("[vendor/POST] linkServiceKey:", linkServiceKey)

  if (linkServiceKey) {
    try {
      const linkSvc = req.scope.resolve(linkServiceKey) as any
      const existingLinks = await linkSvc.list({ product_id: id })
      console.log("[vendor/POST] links found via linkSvc:", JSON.stringify(existingLinks))

      for (const link of existingLinks) {
        // softDelete por product_id+mt_vendor_id
        await linkSvc.softDelete({ product_id: id, mt_vendor_id: link.mt_vendor_id }).catch(
          (e: unknown) => console.warn("[vendor/POST] softDelete via linkSvc failed:", String(e))
        )
      }
    } catch (e: unknown) {
      console.warn("[vendor/POST] linkSvc access failed:", String(e))

      // Fallback: dismiss por todos los vendors conocidos
      const vendorSvc = req.scope.resolve(VENDOR_MODULE) as any
      const allVendors: { id: string }[] = await vendorSvc.listMtVendors({}, { select: ["id"] }).catch(() => [])
      for (const v of allVendors) {
        await remoteLink.restore({
          [Modules.PRODUCT]: { product_id: id },
          [VENDOR_MODULE]: { mt_vendor_id: v.id },
        }).catch(() => {})
        await remoteLink.dismiss({
          [Modules.PRODUCT]: { product_id: id },
          [VENDOR_MODULE]: { mt_vendor_id: v.id },
        }).catch(() => {})
      }
    }
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
