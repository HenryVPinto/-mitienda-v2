import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  if (!orders.length) {
    return res.status(404).json({ message: "Order not found" })
  }

  const vendor = (orders[0] as any).mt_vendor ?? null
  return res.json({ vendor })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { vendor_id } = req.body as any

  if (!vendor_id) {
    return res.status(400).json({ message: "vendor_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  await remoteLink.dismiss({
    [Modules.ORDER]: { order_id: id },
    [VENDOR_MODULE]: {},
  }).catch(() => {})

  await remoteLink.create({
    [Modules.ORDER]: { order_id: id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor_id },
  })

  return res.json({ success: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  const vendor = (orders[0] as any)?.mt_vendor
  if (!vendor?.id) {
    return res.json({ success: true })
  }

  await remoteLink.dismiss({
    [Modules.ORDER]: { order_id: id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor.id },
  })

  return res.json({ success: true })
}
