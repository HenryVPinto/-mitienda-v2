import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

export default async function cleanupTestOrders({ container }: ExecArgs) {
  const orderService = container.resolve(Modules.ORDER)

  const orders = await orderService.listOrders({}, { select: ["id", "display_id", "email"] })

  if (orders.length === 0) {
    console.log("No hay órdenes que limpiar.")
    return
  }

  console.log(`Eliminando ${orders.length} órdenes de prueba:`)
  orders.forEach(o => console.log(`  - #${o.display_id} (${o.email})`))

  await orderService.deleteOrders(orders.map(o => o.id))

  console.log("✅ Órdenes eliminadas correctamente.")
}
