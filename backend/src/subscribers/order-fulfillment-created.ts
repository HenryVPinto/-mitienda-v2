import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resend, FROM, STORE_NAME, formatPrice, emailHeader } from "../lib/resend"

export default async function orderFulfillmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ order_id: string; fulfillment_id: string; no_notification?: boolean }>) {
  if (data.no_notification) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "total",
      "items.*",
      "shipping_address.*",
    ],
    filters: { id: data.order_id },
  })

  const order = orders[0]
  if (!order) return

  const items = Array.isArray(order.items) ? order.items : []
  const address = order.shipping_address
  const addressText = address
    ? `${address.first_name} ${address.last_name}, ${address.address_1}${address.address_2 ? `, ${address.address_2}` : ""}, ${address.city}`
    : "No disponible"

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      ${emailHeader()}
      <div style="background:#e3f2fd;border-left:4px solid #1976d2;padding:15px;border-radius:4px;margin-bottom:20px;">
        <h2 style="margin:0;color:#1565c0;">¡Tu pedido está en camino!</h2>
      </div>
      <p>Tu pedido <strong>#${order.display_id}</strong> ha sido despachado y está en camino a tu dirección.</p>

      <div style="background:#f8f8f8;padding:15px;border-radius:6px;margin:20px 0;">
        <h3 style="margin:0 0 8px;">Dirección de entrega</h3>
        <p style="margin:0;">${addressText}</p>
      </div>

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
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.unit_price * item.quantity)}</td>
          </tr>`
          )
          .join("")}</tbody>
      </table>

      <p style="font-weight:bold;">Total: ${formatPrice(order.total)}</p>
      <p>Pronto recibirás tu pedido. ¡Gracias por tu compra en ${STORE_NAME}!</p>
      <p style="color:#888;font-size:13px;">¿Tienes alguna duda? Escríbenos a <a href="mailto:hola@mitienda.com.gt" style="color:#e63946;">hola@mitienda.com.gt</a></p>
    </body>
    </html>`

  await resend.emails.send({
    from: FROM,
    to: order.email,
    subject: `🚚 Tu pedido #${order.display_id} está en camino`,
    html,
  })
}

export const config: SubscriberConfig = {
  event: "order.fulfillment_created",
}
