import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)

  const profile = await vendorService.retrieveMtVendor(vendor.vendor_id)
  return res.json({ vendor: profile })
}

export const PATCH = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const { description, contact_phone, address, city } = req.body as any

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)

  const updateData: any = {}
  if (description !== undefined) updateData.description = description
  if (contact_phone !== undefined) updateData.contact_phone = contact_phone
  if (address !== undefined) updateData.address = address
  if (city !== undefined) updateData.city = city

  const [updated] = await vendorService.updateMtVendors([
    { id: vendor.vendor_id, ...updateData },
  ])

  return res.json({ vendor: updated })
}
