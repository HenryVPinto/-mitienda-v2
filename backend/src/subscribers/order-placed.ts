import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resend, FROM, ADMIN_EMAIL, STORE_NAME, STORE_URL, formatPrice, emailHeader, emailFooter } from "../lib/resend"

export default async function orderPlacedHandler({
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
      "email",
      "currency_code",
      "subtotal",
      "shipping_total",
      "total",
      "items.*",
      "shipping_address.*",
      "metadata",
    ],
    filters: { id: orderId },
  })

  const order = orders[0]
  if (!order) return

  const paymentMethod = (order.metadata as Record<string, unknown>)?.payment_method as string | undefined
  const paymentLabel =
    paymentMethod === "bank_transfer" ? "Depósito / Transferencia" :
    paymentMethod === "visalink" ? "NeoLink / Link de pago" :
    "Contra entrega"

  const items = Array.isArray(order.items) ? order.items : []
  const address = order.shipping_address

  const itemsHtml = items
    .map(
      (item: any) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${item.title}${item.variant_title ? ` - ${item.variant_title}` : ""}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.unit_price)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.unit_price * item.quantity)}</td>
      </tr>`
    )
    .join("")

  const addressText = address
    ? `${address.first_name} ${address.last_name}<br>${address.address_1}${address.address_2 ? `, ${address.address_2}` : ""}<br>${address.city}${address.province ? `, ${address.province}` : ""}`
    : "No disponible"

  const customerHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      ${emailHeader()}
      <h2 style="color:#333;">¡Gracias por tu pedido!</h2>
      <p>Hemos recibido tu pedido <strong>#${order.display_id}</strong> y lo estamos procesando.</p>

      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:10px;text-align:left;">Producto</th>
            <th style="padding:10px;text-align:center;">Cant.</th>
            <th style="padding:10px;text-align:right;">Precio</th>
            <th style="padding:10px;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div style="text-align:right;margin:10px 0;">
        <p style="margin:4px 0;">Subtotal: ${formatPrice(order.subtotal)}</p>
        <p style="margin:4px 0;">Envío: ${formatPrice(order.shipping_total)}</p>
        <p style="margin:4px 0;font-size:18px;font-weight:bold;">Total: ${formatPrice(order.total)}</p>
      </div>

      <div style="background:#f8f8f8;padding:15px;border-radius:6px;margin:20px 0;">
        <h3 style="margin:0 0 4px;">Método de pago</h3>
        <p style="margin:0;">${paymentLabel}</p>
      </div>

      <div style="background:#f8f8f8;padding:15px;border-radius:6px;margin:20px 0;">
        <h3 style="margin:0 0 8px;">Dirección de entrega</h3>
        <p style="margin:0;">${addressText}</p>
      </div>

      <p>Te notificaremos cuando tu pedido sea despachado.</p>
      <p style="color:#888;font-size:13px;">Si tienes dudas escríbenos a <a href="mailto:${ADMIN_EMAIL}" style="color:#e63946;">${ADMIN_EMAIL}</a></p>
      ${emailFooter()}
    </body>
    </html>`

  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <h2>Nuevo pedido #${order.display_id}</h2>
      <p><strong>Cliente:</strong> ${order.email}</p>
      <p><strong>Total:</strong> ${formatPrice(order.total)}</p>
      <p><strong>Método de pago:</strong> ${paymentLabel}</p>
      <p><strong>Dirección:</strong> ${addressText}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#f8f8f8;">
            <th style="padding:8px;text-align:left;">Producto</th>
            <th style="padding:8px;text-align:center;">Cant.</th>
            <th style="padding:8px;text-align:right;">Precio</th>
          </tr>
        </thead>
        <tbody>${items
          .map(
            (item: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${item.title}${item.variant_title ? ` - ${item.variant_title}` : ""}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.unit_price)}</td>
          </tr>`
          )
          .join("")}</tbody>
      </table>
      <p><a href="${STORE_URL}/admin/orders/${order.id}" style="color:#e63946;">Ver pedido en el admin</a></p>
    </body>
    </html>`

  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: order.email,
      subject: `✅ Pedido #${order.display_id} recibido - ${STORE_NAME}`,
      html: customerHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `🛍️ Nuevo pedido #${order.display_id} de ${order.email}`,
      html: adminHtml,
    }),
  ])
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
