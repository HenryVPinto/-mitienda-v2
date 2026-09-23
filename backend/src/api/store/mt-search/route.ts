import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const LIMIT = 24

// Strips diacritics/accents in JavaScript (for building SQL patterns)
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

// SQL: normalize a column value for accent-insensitive ILIKE (no pg extension needed)
// LOWER() + TRANSLATE strips the most common Spanish accented characters
const ACCENT_FROM = "áéíóúàèìòùäëïöüâêîôûãõñ"
const ACCENT_TO   = "aeiouaeiouaeiouaeiouaon"
function norm(expr: string): string {
  return `TRANSLATE(LOWER(${expr}), '${ACCENT_FROM}', '${ACCENT_TO}')`
}

// GET /store/mt-search?q=...&limit=24&offset=0
//
// Improvements over basic ILIKE:
//   - Accent-insensitive: "sabanas" matches "Sábanas"
//   - Fuzzy (typo tolerance): middle-substring fallback for words >= 6 chars
//     e.g. "zafari"/"safary" → pattern "%afar%" → matches "safari"
//   - Relevance ordering: title (40) > description (15) > tags/keywords (8/5)
//   - Multi-word precision: product with ALL words in title ranks first
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const q = (req.query.q as string | undefined)?.trim() ?? ""
  const limit = Math.min(Number(req.query.limit) || LIMIT, 100)
  const offset = Number(req.query.offset) || 0

  if (!q) return res.json({ products: [], count: 0 })

  const words = q.split(/\s+/).filter(Boolean)
  const normalized = words.map(w => stripAccents(w).toLowerCase())

  // Primary patterns: %word% (accent-stripped)
  const exactPatterns = normalized.map(w => `%${w}%`)

  // Fuzzy fallback: middle substring para palabras >= 4 chars
  // "zafari"[1:-1] = "afar" → "%afar%" matches "safari"
  // "mesa"[1:-1] = "es" → "%es%" matches "mesa"
  const fuzzyPatterns = normalized
    .filter(w => w.length >= 4)
    .map(w => `%${w.slice(1, w.length - 1)}%`)

  const allPatterns = [...exactPatterns, ...fuzzyPatterns]
  const nExact = exactPatterns.length

  // WHERE condition for pattern at parameter index i
  function matchCond(i: number): string {
    const p = `$${i + 1}`
    return `(
      ${norm("p.title")} ILIKE ${p}
      OR ${norm("COALESCE(p.description, '')")} ILIKE ${p}
      OR LOWER(p.handle) ILIKE ${p}
      OR ${norm("COALESCE(t.value, '')")} ILIKE ${p}
      OR ${norm("COALESCE(pv.title, '')")} ILIKE ${p}
      OR ${norm("COALESCE(p.metadata->>'search_keywords', '')")} ILIKE ${p}
    )`
  }

  // Relevance score per pattern — exact matches worth much more than fuzzy
  function scoreTerm(i: number, isExact: boolean): string {
    const p = `$${i + 1}`
    const pts = {
      title:  isExact ? 40 : 5,
      desc:   isExact ? 15 : 2,
      handle: isExact ? 10 : 1,
      tag:    isExact ? 8  : 1,
      kw:     isExact ? 5  : 1,
    }
    return `(
      CASE WHEN ${norm("p.title")} ILIKE ${p} THEN ${pts.title} ELSE 0 END
      + CASE WHEN ${norm("COALESCE(p.description, '')")} ILIKE ${p} THEN ${pts.desc} ELSE 0 END
      + CASE WHEN LOWER(p.handle) ILIKE ${p} THEN ${pts.handle} ELSE 0 END
      + CASE WHEN ${norm("COALESCE(t.value, '')")} ILIKE ${p} THEN ${pts.tag} ELSE 0 END
      + CASE WHEN ${norm("COALESCE(pv.title, '')")} ILIKE ${p} THEN ${pts.tag} ELSE 0 END
      + CASE WHEN ${norm("COALESCE(p.metadata->>'search_keywords', '')")} ILIKE ${p} THEN ${pts.kw} ELSE 0 END
    )`
  }

  const whereConditions = allPatterns.map((_, i) => matchCond(i)).join(" OR ")
  const scoreExpr = [
    ...exactPatterns.map((_, i) => scoreTerm(i, true)),
    ...fuzzyPatterns.map((_, j) => scoreTerm(nExact + j, false)),
  ].join(" + ")

  const fromClause = `
    FROM product p
    LEFT JOIN product_tags pt ON pt.product_id = p.id
    LEFT JOIN product_tag t ON t.id = pt.product_tag_id AND t.deleted_at IS NULL
    LEFT JOIN product_variant pv ON pv.product_id = p.id AND pv.deleted_at IS NULL
  `
  const whereClause = `
    WHERE p.deleted_at IS NULL AND p.status = 'published'
      AND (${whereConditions})
  `

  try {
    // Ejecutar query principal y conteo en paralelo
    const [{ rows }, { rows: countRows }] = await Promise.all([
      pool.query(
        `SELECT p.id, p.title, p.handle, p.thumbnail,
                MAX(${scoreExpr}) AS relevance
         ${fromClause}
         ${whereClause}
         GROUP BY p.id, p.title, p.handle, p.thumbnail
         ORDER BY relevance DESC, p.title
         LIMIT $${allPatterns.length + 1} OFFSET $${allPatterns.length + 2}`,
        [...allPatterns, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(DISTINCT p.id) AS total
         ${fromClause}
         ${whereClause}`,
        allPatterns
      ),
    ])

    res.json({
      products: rows.map(r => ({ id: r.id, title: r.title, handle: r.handle, thumbnail: r.thumbnail })),
      count: Number(countRows[0]?.total ?? 0),
    })
  } catch (err) {
    console.error("[mt-search GET]", err)
    res.status(500).json({ message: "Error en la búsqueda" })
  }
}
