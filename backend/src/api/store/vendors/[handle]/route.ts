import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import VendorModuleService from "../../../../modules/vendor/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendor] = await vendorService.listMtVendors({
    handle: req.params.handle,
    is_active: true,
  })
  if (!vendor) {
    return res.status(404).json({ type: "not_found", message: "Vendor not found" })
  }
  res.json({ vendor })
}
