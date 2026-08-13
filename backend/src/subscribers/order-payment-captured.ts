import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resend, FROM, STORE_NAME, STORE_URL, formatPrice } from "../lib/resend"

export default async function orderPaymentCapturedHandler({
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
      "total",
      "items.*",
      "shipping_address.*",
    ],
    filters: { id: orderId },
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
      <div style="text-align:center;margin-bottom:30px;">
        <h1 style="color:#e63946;margin:0;">${STORE_NAME}</h1>
      </div>
      <div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:15px;border-radius:4px;margin-bottom:20px;">
        <h2 style="margin:0;color:#2e7d32;">¡Pago confirmado!</h2>
      </div>
      <p>Tu pago para el pedido <strong>#${order.display_id}</strong> ha sido confirmado.</p>
      <p><strong>Total pagado:</strong> ${formatPrice(order.total)}</p>
      <p><strong>Dirección de entrega:</strong> ${addressText}</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tbody>${items
          .map(
            (item: any) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;">${item.title}${item.variant_title ? ` - ${item.variant_title}` : ""} x${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #f0f0f0;text-align:right;">${formatPrice(item.unit_price * item.quantity)}</td>
          </tr>`
          )
          .join("")}</tbody>
      </table>
      <p>Pronto recibirás tu pedido. ¡Gracias por tu compra!</p>
      <p style="color:#888;font-size:13px;">¿Tienes alguna duda? Escríbenos a <a href="mailto:hola@mitienda.com.gt" style="color:#e63946;">hola@mitienda.com.gt</a></p>
    </body>
    </html>`

  await resend.emails.send({
    from: FROM,
    to: order.email,
    subject: `💳 Pago confirmado - Pedido #${order.display_id}`,
    html,
  })
}

export const config: SubscriberConfig = {
  event: "order.payment_captured",
}
