import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /store/mt-ofertas?limit=24&offset=0
// Retorna handles de productos que tienen precio tachado (compare_at_price en metadata
// de variante) o están en una price_list activa de tipo 'sale'.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const limit = Math.min(Number(req.query.limit) || 24, 100)
  const offset = Number(req.query.offset) || 0

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT p.id, p.handle, p.title
       FROM product p
       JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
         AND p.status = 'published'
         AND (
           -- Precio de comparación definido manualmente en metadata de la variante
           (pv.metadata->>'compare_at_price') IS NOT NULL
           OR
           -- Precio en una price_list activa de tipo sale
           EXISTS (
             SELECT 1
             FROM product_variant_price_set pvps
             JOIN price pr ON pr.price_set_id = pvps.price_set_id
             JOIN price_list pl ON pl.id = pr.price_list_id
             WHERE pvps.variant_id = pv.id
               AND pl.status = 'active'
               AND (pl.starts_at IS NULL OR pl.starts_at <= NOW())
               AND (pl.ends_at   IS NULL OR pl.ends_at   > NOW())
           )
         )
       ORDER BY p.title
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM product p
       JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
         AND p.status = 'published'
         AND (
           (pv.metadata->>'compare_at_price') IS NOT NULL
           OR EXISTS (
             SELECT 1
             FROM product_variant_price_set pvps
             JOIN price pr ON pr.price_set_id = pvps.price_set_id
             JOIN price_list pl ON pl.id = pr.price_list_id
             WHERE pvps.variant_id = pv.id
               AND pl.status = 'active'
               AND (pl.starts_at IS NULL OR pl.starts_at <= NOW())
               AND (pl.ends_at   IS NULL OR pl.ends_at   > NOW())
           )
         )`
    )

    res.json({
      handles: rows.map((r) => r.handle),
      count: Number(countRows[0]?.total ?? 0),
    })
  } catch (err) {
    console.error("[mt-ofertas GET]", err)
    res.status(500).json({ message: "Error al obtener ofertas" })
  }
}
