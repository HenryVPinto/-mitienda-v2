import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { VENDOR_MODULE } from "../../../../../modules/vendor"
import { Pool } from "pg"

// Pool compartido para no crear conexiones por cada request
let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  if (!products.length) {
    return res.status(404).json({ message: "Product not found" })
  }

  const vendor = (products[0] as any).mt_vendor ?? null
  return res.json({ vendor })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const { vendor_id } = req.body as any

  if (!vendor_id) {
    return res.status(400).json({ message: "vendor_id is required" })
  }

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  // Eliminar cualquier link existente (activo o soft-deleted) directamente desde
  // la tabla del link. Resuelve links huérfanos donde el vendor fue borrado y
  // remoteLink.dismiss no puede encontrarlo por el JOIN de query.graph.
  try {
    const db = getPool()

    // Diagnóstico: columnas y filas de la tabla
    const colRes = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'product_product_vendor_mt_vendor' ORDER BY ordinal_position`
    )
    console.log("[vendor/POST] columns:", colRes.rows.map((r: any) => r.column_name).join(", "))

    const allRows = await db.query(`SELECT * FROM product_product_vendor_mt_vendor LIMIT 10`)
    console.log("[vendor/POST] all rows sample:", JSON.stringify(allRows.rows))

    const matchRows = await db.query(
      `SELECT * FROM product_product_vendor_mt_vendor WHERE product_id = $1`,
      [id]
    )
    console.log("[vendor/POST] rows for product_id", id, ":", JSON.stringify(matchRows.rows))

    const result = await db.query(
      `DELETE FROM product_product_vendor_mt_vendor WHERE product_id = $1`,
      [id]
    )
    console.log("[vendor/POST] deleted rows:", result.rowCount)
  } catch (dbErr: unknown) {
    console.warn("[vendor/POST] raw delete failed:", String(dbErr))
    // Fallback: dismiss vía remoteLink para todos los vendors conocidos
    const vendorSvc = req.scope.resolve(VENDOR_MODULE) as any
    const allVendors: { id: string }[] = await vendorSvc.listMtVendors({}, { select: ["id"] }).catch(() => [])
    for (const v of allVendors) {
      await remoteLink.restore({
        [Modules.PRODUCT]: { product_id: id },
        [VENDOR_MODULE]: { mt_vendor_id: v.id },
      }).catch(() => {})
      await remoteLink.dismiss({
        [Modules.PRODUCT]: { product_id: id },
        [VENDOR_MODULE]: { mt_vendor_id: v.id },
      }).catch(() => {})
    }
  }

  try {
    await remoteLink.create({
      [Modules.PRODUCT]: { product_id: id },
      [VENDOR_MODULE]: { mt_vendor_id: vendor_id },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[vendor/POST] create error:", msg)
    return res.status(500).json({ message: msg })
  }

  return res.json({ success: true })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "mt_vendor.*"],
    filters: { id },
  })

  const vendor = (products[0] as any)?.mt_vendor
  if (!vendor?.id) {
    return res.json({ success: true })
  }

  await remoteLink.dismiss({
    [Modules.PRODUCT]: { product_id: id },
    [VENDOR_MODULE]: { mt_vendor_id: vendor.id },
  })

  return res.json({ success: true })
}
