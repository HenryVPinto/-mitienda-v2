import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: vendors } = await query.graph({
    entity: "mt_vendor",
    fields: ["id", "customer.*"],
    filters: { id },
  })

  if (!vendors.length) {
    return res.status(404).json({ message: "Vendor not found" })
  }

  const customer = (vendors[0] as any).customer ?? null
  return res.json({ customer })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { customer_id } = req.body as any

  if (!customer_id) {
    return res.status(400).json({ message: "customer_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  await remoteLink.dismiss({
    [VENDOR_MODULE]: { mt_vendor_id: id },
    customerService: {},
  }).catch(() => {})

  await remoteLink.create({
    [VENDOR_MODULE]: { mt_vendor_id: id },
    customerService: { customer_id },
  })

  return res.json({ success: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: vendors } = await query.graph({
    entity: "mt_vendor",
    fields: ["id", "customer.*"],
    filters: { id },
  })

  const customer = (vendors[0] as any)?.customer
  if (!customer?.id) {
    return res.json({ success: true })
  }

  await remoteLink.dismiss({
    [VENDOR_MODULE]: { mt_vendor_id: id },
    customerService: { customer_id: customer.id },
  })

  return res.json({ success: true })
}
