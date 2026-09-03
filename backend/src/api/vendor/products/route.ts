import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../modules/vendor"
import { BRAND_MODULE } from "../../../modules/brand"
import { resend, FROM, ADMIN_EMAIL, STORE_URL, emailHeader, emailFooter } from "../../../lib/resend"
import VendorModuleService from "../../../modules/vendor/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Query from product side (includes drafts) — mt_vendor→product traversal
  // skips drafts due to Medusa's default published-only scope on that direction.
  const { data: allProducts } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "variants.id",
      "variants.inventory_quantity",
      "variants.prices.*",
      "mt_vendor.id",
    ],
    pagination: { take: 500 },
  })

  const products = allProducts.filter((p: any) => {
    const v = Array.isArray(p.mt_vendor) ? p.mt_vendor[0] : p.mt_vendor
    return v?.id === vendor.vendor_id
  })

  return res.json({ products })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const vendor = (req as any).vendor
  const { title, description, category_id, brand_id } = req.body as any

  if (!title) {
    return res.status(400).json({ message: "Título es requerido" })
  }

  const productModule = req.scope.resolve(Modules.PRODUCT)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const productData: any = { title, status: "draft" }
  if (description) productData.description = description
  if (category_id) productData.categories = [{ id: category_id }]

  const [product] = await productModule.createProducts([productData])

  await remoteLink.create({
    [Modules.PRODUCT]: { product_id: product.id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor.vendor_id },
  })

  if (brand_id) {
    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: product.id },
      [BRAND_MODULE]: { mt_brand_id: brand_id },
    }).catch(() => {})
  }

  // Notify admin of new draft product
  try {
    const vendorService = req.scope.resolve<VendorModuleService>(VENDOR_MODULE)
    const [vendorRecord] = await vendorService.listMtVendors({ id: vendor.vendor_id })
    const vendorName = vendorRecord?.name ?? vendor.vendor_name ?? "Un emprendedor"

    await resend.emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Nuevo producto en revisión — ${title}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          ${emailHeader()}
          <h2 style="font-size:18px;font-weight:700;color:#111;margin:0 0 16px;">
            Nuevo producto enviado a revisión
          </h2>
          <p style="color:#444;margin:0 0 8px;">
            El emprendedor <strong>${vendorName}</strong> ha creado un producto nuevo que requiere tu revisión antes de publicarse.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px;width:120px;">Producto</td>
              <td style="padding:8px 0;color:#111;font-size:14px;font-weight:600;">${title}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px;">Emprendedor</td>
              <td style="padding:8px 0;color:#111;font-size:14px;">${vendorName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;color:#666;font-size:14px;">Estado</td>
              <td style="padding:8px 0;color:#f59e0b;font-size:14px;font-weight:600;">Borrador</td>
            </tr>
          </table>
          <a href="${STORE_URL.replace('www.', 'admin.')}/products/${product.id}"
             style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver producto en el admin
          </a>
          ${emailFooter()}
        </div>
      `,
    })
  } catch {
    // Notification failure doesn't affect product creation
  }

  return res.status(201).json({ product })
}
