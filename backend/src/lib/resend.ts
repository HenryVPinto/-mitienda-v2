import { Resend } from "resend"

export const resend = new Resend(process.env.RESEND_API_KEY)

export const FROM = "MiTienda <hola@mitienda.com.gt>"
export const ADMIN_EMAIL = "hola@mitienda.com.gt"
export const STORE_NAME = "MiTienda"
export const STORE_URL = "https://mitienda.com.gt"
export const LOGO_URL = "https://mitienda.com.gt/logo.png"

export function emailHeader(): string {
  return `
    <div style="text-align:center;padding:24px 0 16px;">
      <a href="${STORE_URL}">
        <img src="${LOGO_URL}" alt="${STORE_NAME}" style="height:48px;width:auto;" />
      </a>
    </div>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 24px;" />`
}

export function formatPrice(amount: number, currency = "GTQ"): string {
  return `Q${(amount / 100).toFixed(2)}`
}
