import { defineMiddlewares, authenticate } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { verifyVendorToken, VENDOR_COOKIE } from "../utils/vendor-auth"
import multer from "multer"

const upload = multer({ storage: multer.memoryStorage() })

// Middleware que valida el JWT de vendor y adjunta el payload a req.vendor
function vendorAuth(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  const token =
    req.cookies?.[VENDOR_COOKIE] ||
    req.headers.authorization?.replace("Bearer ", "")

  if (!token) {
    return res.status(401).json({ message: "No autorizado" })
  }

  const payload = verifyVendorToken(token)
  if (!payload) {
    return res.status(401).json({ message: "Token inválido o expirado" })
  }

  ;(req as any).vendor = payload
  next()
}

export default defineMiddlewares({
  routes: [
    // ── Admin routes ──────────────────────────────────────────────────────────
    {
      matcher: "/admin/brands*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/vendors*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/shipping-rules*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/products*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/orders*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/promotion-rules*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/cms*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    {
      matcher: "/admin/mt-shipping*",
      middlewares: [authenticate("user", ["session", "bearer", "api-key"])],
    },
    // ── Vendor portal routes (JWT propio, excluye /vendor/auth/login y logout) ─
    {
      matcher: "/vendor/auth/me",
      middlewares: [vendorAuth],
    },
    {
      matcher: "/vendor/products*",
      middlewares: [vendorAuth],
    },
    {
      matcher: "/vendor/categories*",
      middlewares: [vendorAuth],
    },
    {
      matcher: "/vendor/brands*",
      middlewares: [vendorAuth],
    },
    {
      method: ["POST"],
      matcher: "/vendor/uploads",
      middlewares: [vendorAuth, upload.array("files") as any],
    },
    {
      matcher: "/vendor/profile*",
      middlewares: [vendorAuth],
    },
    {
      matcher: "/vendor/promotion-rules*",
      middlewares: [vendorAuth],
    },
  ],
})
