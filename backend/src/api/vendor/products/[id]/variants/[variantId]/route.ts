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
  const { id, variantId } = req.params
  const { price_gtq, inventory_quantity, manage_inventory, color_hex, images_urls } =
    req.body as any

  const owned = await verifyOwnership(req, id)
  if (!owned) {
    return res.status(403).json({ message: "No tienes acceso a este producto" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)

  const updateData: any = {}
  if (inventory_quantity !== undefined) updateData.inventory_quantity = inventory_quantity
  if (manage_inventory !== undefined) updateData.manage_inventory = manage_inventory

  // Merge metadata to avoid wiping color_hex when updating images_urls (or vice versa)
  if (color_hex !== undefined || images_urls !== undefined) {
    const [current] = await productModule.listProductVariants(
      { id: variantId },
      { select: ["id", "metadata"] }
    )
    const existingMeta = ((current as any)?.metadata as Record<string, unknown>) ?? {}
    updateData.metadata = { ...existingMeta }
    if (color_hex !== undefined) updateData.metadata.color_hex = color_hex
    if (images_urls !== undefined) updateData.metadata.images_urls = images_urls
  }

  const variant = await productModule.updateProductVariants(variantId, updateData)

  if (price_gtq !== undefined && price_gtq !== null) {
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
      {
        prices: [{ amount: Number(price_gtq), currency_code: "gtq", rules: {} }],
      },
    ])

    await remoteLink.create({
      [Modules.PRODUCT]: { variant_id: variantId },
      [Modules.PRICING]: { price_set_id: newPriceSet.id },
    })
  }

  // Notify when stock hits 0
  if (inventory_quantity === 0) {
    try {
      const query2 = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const { data: products } = await query2.graph({
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

        const stockHtml = (to: string, isAdmin: boolean) => `
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

        // Notify admin
        await resend.emails.send({
          from: FROM,
          to: ADMIN_EMAIL,
          subject: `Sin existencias: ${productTitle} (${vendorName})`,
          html: stockHtml(ADMIN_EMAIL, true),
        })

        // Notify vendor
        if (vendor?.contact_email) {
          await resend.emails.send({
            from: FROM,
            to: vendor.contact_email,
            subject: `Tu producto "${productTitle}" se ha quedado sin existencias`,
            html: stockHtml(vendor.contact_email, false),
          })
        }
      }
    } catch {
      // Non-critical
    }
  }

  return res.json({ variant })
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
