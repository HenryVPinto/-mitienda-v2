import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"
import {
  verifyPassword,
  signVendorToken,
  VENDOR_COOKIE,
} from "../../../utils/vendor-auth"

// POST /vendor/auth/login
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos" })
  }

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
  const [vendors] = await vendorService.listAndCountMtVendors(
    { contact_email: email, is_active: true } as any,
    { take: 1 }
  )

  const vendor = vendors[0]

  if (!vendor || !vendor.password_hash) {
    return res.status(401).json({ message: "Credenciales incorrectas" })
  }

  const valid = verifyPassword(password, vendor.password_hash)
  if (!valid) {
    return res.status(401).json({ message: "Credenciales incorrectas" })
  }

  const token = signVendorToken({
    vendor_id: vendor.id,
    vendor_handle: vendor.handle,
    vendor_name: vendor.name,
  })

  const isProduction = process.env.NODE_ENV === "production"

  res.cookie(VENDOR_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
    path: "/",
  })

  res.json({
    vendor: {
      id: vendor.id,
      name: vendor.name,
      handle: vendor.handle,
      logo_url: vendor.logo_url,
      contact_email: vendor.contact_email,
    },
    token,
  })
}
