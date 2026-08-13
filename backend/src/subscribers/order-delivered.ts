import { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { resend, FROM, STORE_NAME, STORE_URL, emailHeader } from "../lib/resend"

export default async function orderDeliveredHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  if (data.no_notification) return

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // delivery.created emite el fulfillment_id — buscamos la orden via el link
  const { data: links } = await query.graph({
    entity: "order_fulfillment",
    fields: ["order_id", "order.id", "order.display_id", "order.email"],
    filters: { fulfillment_id: data.id },
  })

  const link = links[0]
  if (!link?.order) return

  const order = link.order as any

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      ${emailHeader()}
      <div style="background:#e8f5e9;border-left:4px solid #4caf50;padding:15px;border-radius:4px;margin-bottom:20px;">
        <h2 style="margin:0;color:#2e7d32;">¡Pedido entregado!</h2>
      </div>
      <p>Tu pedido <strong>#${order.display_id}</strong> ha sido entregado exitosamente.</p>
      <p>Esperamos que disfrutes tu compra. ¡Gracias por elegir ${STORE_NAME}!</p>

      <div style="text-align:center;margin:30px 0;">
        <a href="${STORE_URL}" style="background:#e63946;color:white;padding:12px 28px;text-decoration:none;border-radius:6px;font-weight:bold;">
          Seguir comprando
        </a>
      </div>

      <p style="color:#888;font-size:13px;">¿Tuviste algún problema con tu pedido? Escríbenos a <a href="mailto:hola@mitienda.com.gt" style="color:#e63946;">hola@mitienda.com.gt</a></p>
    </body>
    </html>`

  await resend.emails.send({
    from: FROM,
    to: order.email,
    subject: `✅ Tu pedido #${order.display_id} fue entregado - ${STORE_NAME}`,
    html,
  })
}

export const config: SubscriberConfig = {
  event: "delivery.created",
}
