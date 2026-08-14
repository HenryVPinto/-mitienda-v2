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

export function emailFooter(): string {
  return `
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:32px 0 12px;" />
    <p style="text-align:center;font-size:11px;color:#bbb;margin:0;">
      Desarrollado por <a href="https://www.innovate.gt" style="color:#bbb;text-decoration:none;">INNOVATE</a>
    </p>`
}

export function formatPrice(amount: number, currency = "GTQ"): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount)
}
