import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import VendorModuleService from "../../../../modules/vendor/service"
import { UpdateVendorInput } from "../../../../modules/vendor/types"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const vendor = await vendorService.retrieveMtVendor(req.params.id)
  res.json({ vendor })
}

export const PATCH = async (
  req: MedusaRequest<UpdateVendorInput>,
  res: MedusaResponse
) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendor] = await vendorService.updateMtVendors({
    selector: { id: req.params.id },
    data: req.body,
  })
  res.json({ vendor })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  await vendorService.deleteMtVendors([req.params.id])
  res.json({ id: req.params.id, object: "vendor", deleted: true })
}
