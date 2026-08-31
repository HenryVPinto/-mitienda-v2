import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_COOKIE } from "../../../../utils/vendor-auth"

// POST /vendor/auth/logout
export const POST = async (_req: MedusaRequest, res: MedusaResponse) => {
  res.clearCookie(VENDOR_COOKIE, { path: "/" })
  res.json({ success: true })
}
