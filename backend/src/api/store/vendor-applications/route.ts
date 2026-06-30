import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { VENDOR_MODULE } from "../../../modules/vendor"
import VendorModuleService from "../../../modules/vendor/service"

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

  res.status(201).json({ message: "Solicitud enviada exitosamente", id: vendor.id })
}
