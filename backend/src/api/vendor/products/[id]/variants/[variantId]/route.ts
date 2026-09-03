import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
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

    const productModule = req.scope.resolve(Modules.PRODUCT)

    // Fetch existing metadata once — needed for inventory_quantity, color_hex, images_urls merges
    const needsMeta = inventory_quantity !== undefined || color_hex !== undefined || images_urls !== undefined
    let existingMeta: Record<string, unknown> = {}
    if (needsMeta) {
      const [current] = await productModule.listProductVariants(
        { id: variantId },
        { select: ["id", "metadata"] }
      )
      existingMeta = ((current as any)?.metadata as Record<string, unknown>) ?? {}
    }

    const newMeta: Record<string, unknown> = { ...existingMeta }

    // inventory_quantity is NOT a real column in Medusa v2 ProductVariant — store in metadata
    if (inventory_quantity !== undefined) {
      newMeta.vendor_stock = Number(inventory_quantity)
    }
    if (color_hex !== undefined) newMeta.color_hex = color_hex
    if (images_urls !== undefined) newMeta.images_urls = images_urls

    const updatePayload: any = { id: variantId, metadata: newMeta }
    if (manage_inventory !== undefined) updatePayload.manage_inventory = manage_inventory

    const [variant] = await productModule.upsertProductVariants([updatePayload])

    // Update price via pricing module (manual, keeps full control)
    if (price_gtq !== undefined && price_gtq !== null) {
      try {
        const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
        const pricingModule = req.scope.resolve(Modules.PRICING)
        const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

        const { data: variantData } = await query.graph({
          entity: "product_variant",
          fields: ["id", "price_set.id"],
          filters: { id: variantId },
        })

        const priceSetRaw = variantData[0]?.price_set
        const existingPriceSetId = Array.isArray(priceSetRaw)
          ? priceSetRaw[0]?.id
          : priceSetRaw?.id

        if (existingPriceSetId) {
          await remoteLink.dismiss({
            [Modules.PRODUCT]: { variant_id: variantId },
            [Modules.PRICING]: { price_set_id: existingPriceSetId },
          }).catch(() => {})
          await pricingModule.deletePriceSets([existingPriceSetId]).catch(() => {})
        }

        const [newPriceSet] = await pricingModule.createPriceSets([
          { prices: [{ amount: Number(price_gtq), currency_code: "gtq", rules: {} }] },
        ])

        await remoteLink.create({
          [Modules.PRODUCT]: { variant_id: variantId },
          [Modules.PRICING]: { price_set_id: newPriceSet.id },
        }).catch(async () => {
          await remoteLink.dismiss({
            [Modules.PRODUCT]: { variant_id: variantId },
            [Modules.PRICING]: { price_set_id: newPriceSet.id },
          }).catch(() => {})
          await remoteLink.create({
            [Modules.PRODUCT]: { variant_id: variantId },
            [Modules.PRICING]: { price_set_id: newPriceSet.id },
          }).catch(() => {})
        })
      } catch {
        // Price update failure is non-critical
      }
    }

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
              <h2 style="font-size:18px;font-weight:700;color:#dc2626;margin:0 0 16px;">⚠️ Sin existencias</h2>
              <p style="color:#444;margin:0 0 8px;">
                ${isAdmin
                  ? `El producto <strong>${productTitle}</strong> del emprendedor <strong>${vendorName}</strong> ha llegado a <strong>0 existencias</strong>.`
                  : `Tu producto <strong>${productTitle}</strong> ha llegado a <strong>0 existencias</strong>. Actualiza el stock cuando tengas más unidades disponibles.`
                }
              </p>
              ${emailFooter()}
            </div>`

          await resend.emails.send({
            from: FROM, to: ADMIN_EMAIL,
            subject: `Sin existencias: ${productTitle} (${vendorName})`,
            html: stockHtml(true),
          })
          if (vendor?.contact_email) {
            await resend.emails.send({
              from: FROM, to: vendor.contact_email,
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
