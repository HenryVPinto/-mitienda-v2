import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../../modules/vendor"
import VendorModuleService from "../../../../modules/vendor/service"

// GET /vendor/auth/me — requiere middleware de vendor auth
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendorPayload = (req as any).vendor

  if (!vendorPayload) {
    return res.status(401).json({ message: "No autorizado" })
  }

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const vendor = await vendorService.retrieveMtVendor(vendorPayload.vendor_id, {
    select: ["id", "name", "handle", "logo_url", "contact_email", "contact_phone", "description", "city", "is_active"],
  })

  res.json({ vendor })
}
