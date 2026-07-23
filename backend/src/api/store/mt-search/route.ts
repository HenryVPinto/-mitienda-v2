import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const LIMIT = 24

// GET /store/mt-search?q=blusa+azul&limit=24&offset=0
// Búsqueda amplia: cada palabra del query se busca con OR en título,
// descripción, handle, tags y título de variante.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string | undefined)?.trim() ?? ""
  const limit = Math.min(Number(req.query.limit) || LIMIT, 100)
  const offset = Number(req.query.offset) || 0

  if (!q) {
    return res.json({ products: [], count: 0 })
  }

  // Separar en palabras y crear patrones ILIKE para cada una
  const words = q.split(/\s+/).filter(Boolean)
  const patterns = words.map((w) => `%${w}%`)

  // Condición: al menos UNA palabra debe aparecer en título o descripción
  // Usamos = ANY($1::text[]) con ILIKE sobre cada campo
  const whereConditions = patterns
    .map((_, i) => `(p.title ILIKE $${i + 1} OR p.description ILIKE $${i + 1} OR p.handle ILIKE $${i + 1})`)
    .join(" OR ")

  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT p.id, p.title, p.handle, p.thumbnail,
              p.status, p.deleted_at
       FROM product p
       WHERE p.deleted_at IS NULL
         AND p.status = 'published'
         AND (${whereConditions})
       ORDER BY p.title
       LIMIT $${patterns.length + 1} OFFSET $${patterns.length + 2}`,
      [...patterns, limit, offset]
    )

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(DISTINCT p.id) AS total
       FROM product p
       WHERE p.deleted_at IS NULL
         AND p.status = 'published'
         AND (${whereConditions})`,
      patterns
    )

    res.json({
      products: rows.map((r) => ({ id: r.id, title: r.title, handle: r.handle, thumbnail: r.thumbnail })),
      count: Number(countRows[0]?.total ?? 0),
    })
  } catch (err) {
    console.error("[mt-search GET]", err)
    res.status(500).json({ message: "Error en la búsqueda" })
  }
}
