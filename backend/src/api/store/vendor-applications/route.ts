import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"
import { resend, FROM, ADMIN_EMAIL, STORE_NAME, emailHeader, emailFooter } from "../../../lib/resend"

function toHandle(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80)
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { name, contact_email, contact_phone, city, description } = req.body as Record<string, string>

  if (!name?.trim()) {
    return res.status(400).json({ message: "El nombre del negocio es requerido" })
  }
  if (!contact_email?.trim()) {
    return res.status(400).json({ message: "El correo electrónico es requerido" })
  }

  const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)

  // Check duplicate email
  const [existing] = await vendorService.listMtVendors({ contact_email: contact_email.trim() })
  if (existing) {
    return res.status(400).json({ message: "Ya existe una solicitud registrada con ese correo electrónico" })
  }

  // Generate unique handle
  const base = toHandle(name.trim()) || "vendor"
  let handle = base
  let i = 1
  while (true) {
    const [clash] = await vendorService.listMtVendors({ handle })
    if (!clash) break
    handle = `${base}-${i++}`
  }

  const vendor = await vendorService.createMtVendors({
    name: name.trim(),
    handle,
    contact_email: contact_email.trim(),
    contact_phone: contact_phone?.trim() || null,
    city: city?.trim() || null,
    description: description?.trim() || null,
    is_active: false,
    metadata: {
      status: "pending",
      applied_at: new Date().toISOString(),
    },
  })

  const emprendedorHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      ${emailHeader()}
      <h2>¡Recibimos tu solicitud!</h2>
      <p>Hola <strong>${name.trim()}</strong>,</p>
      <p>Gracias por tu interés en vender en ${STORE_NAME}. Hemos recibido tu solicitud y la revisaremos a la brevedad.</p>
      <div style="background:#f8f8f8;padding:15px;border-radius:6px;margin:20px 0;">
        <h3 style="margin:0 0 10px;">Resumen de tu solicitud</h3>
        <p style="margin:4px 0;"><strong>Negocio:</strong> ${name.trim()}</p>
        <p style="margin:4px 0;"><strong>Correo:</strong> ${contact_email.trim()}</p>
        ${contact_phone ? `<p style="margin:4px 0;"><strong>Teléfono:</strong> ${contact_phone.trim()}</p>` : ""}
        ${city ? `<p style="margin:4px 0;"><strong>Ciudad:</strong> ${city.trim()}</p>` : ""}
      </div>
      <p>Te contactaremos al correo <strong>${contact_email.trim()}</strong> cuando hayamos revisado tu solicitud.</p>
      <p style="color:#888;font-size:13px;">¿Tienes alguna duda? Escríbenos a <a href="mailto:${ADMIN_EMAIL}" style="color:#e63946;">${ADMIN_EMAIL}</a></p>
      ${emailFooter()}
    </body>
    </html>`

  const adminHtml = `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px;">
      <h2>🏪 Nueva solicitud de vendedor</h2>
      <p><strong>Negocio:</strong> ${name.trim()}</p>
      <p><strong>Correo:</strong> ${contact_email.trim()}</p>
      ${contact_phone ? `<p><strong>Teléfono:</strong> ${contact_phone.trim()}</p>` : ""}
      ${city ? `<p><strong>Ciudad:</strong> ${city.trim()}</p>` : ""}
      ${description ? `<p><strong>Descripción:</strong> ${description.trim()}</p>` : ""}
      <p style="margin-top:20px;"><a href="https://api.miti.com.gt/app/vendors" style="background:#e63946;color:white;padding:10px 20px;text-decoration:none;border-radius:4px;">Ver en el admin</a></p>
    </body>
    </html>`

  await Promise.all([
    resend.emails.send({
      from: FROM,
      to: contact_email.trim(),
      subject: `✅ Recibimos tu solicitud para vender en ${STORE_NAME}`,
      html: emprendedorHtml,
    }),
    resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `🏪 Nueva solicitud de vendedor: ${name.trim()}`,
      html: adminHtml,
    }),
  ]).catch((err) => {
    console.error("Error sending vendor application emails:", err)
  })

  res.status(201).json({ message: "Solicitud enviada exitosamente", id: vendor.id })
}
