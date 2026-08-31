import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import VendorModuleService from "../../../../../modules/vendor/service"
import { hashPassword } from "../../../../../utils/vendor-auth"

// POST /admin/vendors/:id/set-password
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { password } = req.body as { password?: string }

  if (!password || password.length < 8) {
    return res
      .status(400)
      .json({ message: "La contraseña debe tener al menos 8 caracteres" })
  }

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)

  const vendor = await vendorService.updateMtVendors({
    id,
    password_hash: hashPassword(password),
  })

  res.json({ success: true, vendor_id: vendor.id ?? id })
}
