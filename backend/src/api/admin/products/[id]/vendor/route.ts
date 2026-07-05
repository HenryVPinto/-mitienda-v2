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

  // Buscar el servicio del link en el contenedor de Awilix inspeccionando
  // sus registros para encontrar la clave del módulo product-vendor link.
  const allContainerKeys = Object.keys((req.scope as any).registrations ?? {})
  const vendorLinkKey = allContainerKeys.find((k) => {
    const lower = k.toLowerCase()
    return lower.includes("vendor") && (lower.includes("link") || lower.includes("product"))
  })
  console.log("[vendor/POST] vendorLinkKey:", vendorLinkKey)
  console.log("[vendor/POST] all vendor keys:", allContainerKeys.filter(k => k.toLowerCase().includes("vendor")).join(", "))

  if (vendorLinkKey) {
    try {
      const linkSvc = req.scope.resolve(vendorLinkKey) as any
      if (typeof linkSvc.list === "function") {
        const existingLinks = await linkSvc.list({ product_id: id })
        console.log("[vendor/POST] links found:", JSON.stringify(existingLinks))
        for (const link of existingLinks) {
          await linkSvc.softDelete(
            { product_id: id, mt_vendor_id: link.mt_vendor_id }
          ).catch((e: unknown) => console.warn("[vendor/POST] softDelete error:", String(e)))
        }
      }
    } catch (e: unknown) {
      console.warn("[vendor/POST] linkSvc resolve error:", String(e))
    }
  }

  // Fallback: dismiss todos los vendors conocidos
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
