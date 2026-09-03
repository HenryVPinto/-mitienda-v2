import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../modules/vendor"
import VendorModuleService from "../modules/vendor/service"
import { resend, FROM, STORE_URL, emailHeader, emailFooter } from "../lib/resend"

export default async function vendorProductPublishedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const productId = data.id
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "status", "handle", "mt_vendor.id"],
    filters: { id: productId },
  })

  const product = products[0] as any
  if (!product || product.status !== "published") return

  const vendorData = Array.isArray(product.mt_vendor)
    ? product.mt_vendor[0]
    : product.mt_vendor

  if (!vendorData?.id) return

  const vendorService = container.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendor] = await vendorService.listMtVendors({ id: vendorData.id })

  if (!vendor?.contact_email) return

  // Use metadata flag to avoid sending duplicate notifications
  const productModule: any = container.resolve("productModuleService")
  const [fullVariant] = await productModule.listProducts({ id: productId }, { select: ["metadata"] })
  const meta = (fullVariant?.metadata as Record<string, unknown>) ?? {}
  if (meta.vendor_notified_published) return

  try {
    await resend.emails.send({
      from: FROM,
      to: vendor.contact_email,
      subject: `¡Tu producto ya está publicado en MiTienda! — ${product.title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          ${emailHeader()}
          <h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 16px;">
            ¡Buenas noticias, ${vendor.name}!
          </h2>
          <p style="color:#444;margin:0 0 16px;">
            Tu producto <strong>${product.title}</strong> ha sido revisado y aprobado por nuestro equipo.
            Ya está visible para todos los clientes de MiTienda.
          </p>
          <a href="${STORE_URL}/productos/${product.handle ?? product.id}"
             style="display:inline-block;background:#16a34a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:16px;">
            Ver mi producto
          </a>
          <p style="color:#666;font-size:13px;margin:16px 0 0;">
            También puedes verlo desde tu portal de emprendedor en
            <a href="${STORE_URL}/mi-tienda/productos" style="color:#2563eb;">${STORE_URL}/mi-tienda/productos</a>
          </p>
          ${emailFooter()}
        </div>
      `,
    })

    // Mark as notified to avoid duplicates on subsequent edits
    await productModule.updateProducts(productId, {
      metadata: { ...meta, vendor_notified_published: true },
    })
  } catch {
    // Swallow — notification failure is non-critical
  }
}

export const config: SubscriberConfig = {
  event: "product.updated",
}
