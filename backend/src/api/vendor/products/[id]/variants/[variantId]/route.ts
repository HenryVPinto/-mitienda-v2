import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { updateProductVariantsWorkflow } from "@medusajs/medusa/core-flows"
import { VENDOR_MODULE } from "../../../../../../modules/vendor"
import VendorModuleService from "../../../../../../modules/vendor/service"
import { resend, FROM, ADMIN_EMAIL, emailHeader, emailFooter } from "../../../../../../lib/resend"

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
  try {
    const { id, variantId } = req.params
    const { price_gtq, inventory_quantity, manage_inventory, color_hex, images_urls } =
      req.body as any

    const owned = await verifyOwnership(req, id)
    if (!owned) {
      return res.status(403).json({ message: "No tienes acceso a este producto" })
    }

    // Build variant update — use workflow so inventory_quantity and prices are handled correctly
    const variantUpdate: any = { id: variantId }

    if (inventory_quantity !== undefined) variantUpdate.inventory_quantity = inventory_quantity
    if (manage_inventory !== undefined) variantUpdate.manage_inventory = manage_inventory
    if (price_gtq !== undefined && price_gtq !== null) {
      variantUpdate.prices = [{ amount: Number(price_gtq), currency_code: "gtq" }]
    }

    // Merge existing metadata before updating to avoid wiping other keys
    if (color_hex !== undefined || images_urls !== undefined) {
      const productModule = req.scope.resolve(Modules.PRODUCT)
      const [current] = await productModule.listProductVariants(
        { id: variantId },
        { select: ["id", "metadata"] }
      )
      const existingMeta = ((current as any)?.metadata as Record<string, unknown>) ?? {}
      variantUpdate.metadata = { ...existingMeta }
      if (color_hex !== undefined) variantUpdate.metadata.color_hex = color_hex
      if (images_urls !== undefined) variantUpdate.metadata.images_urls = images_urls
    }

    const { result } = await updateProductVariantsWorkflow(req.scope).run({
      input: { product_variants: [variantUpdate] } as any,
    })

    const variant = result[0]

    // Notify when stock hits 0
    if (inventory_quantity === 0) {
      try {
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
        const { data: products } = await query.graph({
          entity: "product",
          fields: ["id", "title", "mt_vendor.id"],
          filters: { id },
        })
        const p = products[0] as any
        const vendorData = Array.isArray(p?.mt_vendor) ? p.mt_vendor[0] : p?.mt_vendor
        const productTitle = p?.title ?? "Producto"

        if (vendorData?.id) {
          const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
          const [vendor] = await vendorService.listMtVendors({ id: vendorData.id })
          const vendorName = vendor?.name ?? "Emprendedor"

          const stockHtml = (isAdmin: boolean) => `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              ${emailHeader()}
              <h2 style="font-size:18px;font-weight:700;color:#dc2626;margin:0 0 16px;">
                ⚠️ Sin existencias
              </h2>
              <p style="color:#444;margin:0 0 8px;">
                ${isAdmin
                  ? `El producto <strong>${productTitle}</strong> del emprendedor <strong>${vendorName}</strong> ha llegado a <strong>0 existencias</strong>.`
                  : `Tu producto <strong>${productTitle}</strong> ha llegado a <strong>0 existencias</strong>. Actualiza el stock cuando tengas más unidades disponibles.`
                }
              </p>
              ${emailFooter()}
            </div>`

          await resend.emails.send({
            from: FROM,
            to: ADMIN_EMAIL,
            subject: `Sin existencias: ${productTitle} (${vendorName})`,
            html: stockHtml(true),
          })

          if (vendor?.contact_email) {
            await resend.emails.send({
              from: FROM,
              to: vendor.contact_email,
              subject: `Tu producto "${productTitle}" se ha quedado sin existencias`,
              html: stockHtml(false),
            })
          }
        }
      } catch {
        // Non-critical
      }
    }

    return res.json({ variant })
  } catch (err: any) {
    return res.status(500).json({
      message: err?.message ?? "Error desconocido",
      stack: err?.stack?.split("\n").slice(0, 5),
    })
  }
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
