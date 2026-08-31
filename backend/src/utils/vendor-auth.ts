import crypto from "crypto"
import jwt from "jsonwebtoken"

const VENDOR_JWT_SECRET = () =>
  process.env.JWT_SECRET || "dev-only-insecure-do-not-use-in-production"

const VENDOR_TOKEN_EXPIRY = "7d"

// ── Password hashing ──────────────────────────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto
    .scryptSync(password, salt, 64)
    .toString("hex")
  return `${hash}:${salt}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [hash, salt] = stored.split(":")
  if (!hash || !salt) return false
  const derived = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(Buffer.from(derived), Buffer.from(hash))
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export interface VendorTokenPayload {
  vendor_id: string
  vendor_handle: string
  vendor_name: string
}

export function signVendorToken(payload: VendorTokenPayload): string {
  return jwt.sign({ ...payload, type: "vendor" }, VENDOR_JWT_SECRET(), {
    expiresIn: VENDOR_TOKEN_EXPIRY,
  })
}

export function verifyVendorToken(token: string): VendorTokenPayload | null {
  try {
    const decoded = jwt.verify(token, VENDOR_JWT_SECRET()) as any
    if (decoded.type !== "vendor") return null
    return {
      vendor_id: decoded.vendor_id,
      vendor_handle: decoded.vendor_handle,
      vendor_name: decoded.vendor_name,
    }
  } catch {
    return null
  }
}

export const VENDOR_COOKIE = "mt_vendor_token"
