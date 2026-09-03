import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../modules/vendor"
import VendorModuleService from "../modules/vendor/service"
import { resend, FROM, STORE_URL, emailHeader, emailFooter, formatPrice } from "../lib/resend"

export default async function vendorOrderNotificationHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = data.id
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "items.id",
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.variant_id",
    ],
    filters: { id: orderId },
  })

  const order = orders[0] as any
  if (!order?.items?.length) return

  const items: Array<{ id: string; title: string; quantity: number; unit_price: number; variant_id: string }> =
    Array.isArray(order.items) ? order.items : []

  // Group items by vendor
  const vendorItems = new Map<string, { vendorId: string; items: typeof items }>()

  for (const item of items) {
    if (!item.variant_id) continue
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_quantity", "product.id", "product.title", "product.mt_vendor.id"],
        filters: { id: item.variant_id },
      })

      const variant = variants[0] as any
      const product = variant?.product
      const vendorData = Array.isArray(product?.mt_vendor) ? product.mt_vendor[0] : product?.mt_vendor
      const vendorId = vendorData?.id

      if (!vendorId) continue

      if (!vendorItems.has(vendorId)) {
        vendorItems.set(vendorId, { vendorId, items: [] })
      }
      vendorItems.get(vendorId)!.items.push({
        ...item,
        // attach real-time stock for low-stock warning
        _current_stock: variant?.inventory_quantity ?? null,
      } as any)
    } catch {
      continue
    }
  }

  if (!vendorItems.size) return

  const vendorService = container.resolve<VendorModuleService>(VENDOR_MODULE)

  for (const { vendorId, items: vendorOrderItems } of vendorItems.values()) {
    try {
      const [vendor] = await vendorService.listMtVendors({ id: vendorId })
      if (!vendor?.contact_email) continue

      const totalUnits = vendorOrderItems.reduce((s, i) => s + i.quantity, 0)
      const totalAmount = vendorOrderItems.reduce((s, i) => s + i.unit_price * i.quantity, 0)

      const lowStockItems = (vendorOrderItems as any[]).filter(
        (i) => i._current_stock !== null && i._current_stock <= 3
      )

      const itemsHtml = vendorOrderItems
        .map(
          (i) => `
          <tr>
            <td style="padding:8px 0;font-size:14px;color:#111;border-bottom:1px solid #f5f5f5;">
              ${i.title}
            </td>
            <td style="padding:8px 0;font-size:14px;color:#666;text-align:center;border-bottom:1px solid #f5f5f5;">
              ${i.quantity}
            </td>
            <td style="padding:8px 0;font-size:14px;color:#111;text-align:right;border-bottom:1px solid #f5f5f5;">
              ${formatPrice(i.unit_price * i.quantity)}
            </td>
          </tr>`
        )
        .join("")

      const lowStockWarning = lowStockItems.length
        ? `<div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:8px;padding:12px 16px;margin:16px 0;">
            <strong style="color:#92400e;">⚠️ Stock bajo</strong>
            <p style="color:#92400e;margin:4px 0 0;font-size:13px;">
              ${lowStockItems.map((i: any) => `<strong>${i.title}</strong>: ${i._current_stock ?? 0} unidades`).join(", ")}. Actualiza tu inventario.
            </p>
          </div>`
        : ""

      await resend.emails.send({
        from: FROM,
        to: vendor.contact_email,
        subject: `¡Vendiste ${totalUnits} unidad${totalUnits !== 1 ? "es" : ""}! — Orden #${order.display_id}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            ${emailHeader()}
            <h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 8px;">
              ¡Tienes una nueva venta! 🎉
            </h2>
            <p style="color:#666;font-size:13px;margin:0 0 20px;">Orden #${order.display_id}</p>

            <table style="width:100%;border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="text-align:left;font-size:11px;color:#999;text-transform:uppercase;padding:0 0 8px;">Producto</th>
                  <th style="text-align:center;font-size:11px;color:#999;text-transform:uppercase;padding:0 0 8px;">Cant.</th>
                  <th style="text-align:right;font-size:11px;color:#999;text-transform:uppercase;padding:0 0 8px;">Total</th>
                </tr>
              </thead>
              <tbody>${itemsHtml}</tbody>
            </table>

            <p style="text-align:right;font-weight:700;font-size:15px;color:#111;margin:12px 0 0;">
              Total: ${formatPrice(totalAmount)}
            </p>

            ${lowStockWarning}

            <p style="color:#666;font-size:13px;margin:20px 0 0;">
              Revisa y actualiza tu inventario en
              <a href="${STORE_URL}/mi-tienda/productos" style="color:#2563eb;">${STORE_URL}/mi-tienda/productos</a>
            </p>
            ${emailFooter()}
          </div>
        `,
      })
    } catch {
      continue
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
