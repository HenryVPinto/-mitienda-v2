import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM = "MiTienda <hola@mitienda.com.gt>"
export const ADMIN_EMAIL = "hola@mitienda.com.gt"
export const STORE_NAME = "MiTienda"
export const STORE_URL = "https://mitienda.com.gt"

export function formatPrice(amount: number, currency = "GTQ"): string {
  return `Q${(amount / 100).toFixed(2)}`
}
