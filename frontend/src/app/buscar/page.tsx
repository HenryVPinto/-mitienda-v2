import Link from "next/link"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/lib/types"

type Props = {
  searchParams: Promise<{ q?: string; page?: string }>
}

const LIMIT = 16

const FIELDS =
  "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*"

async function searchProducts(query: string, page: number) {
  const offset = (page - 1) * LIMIT

  // 1. Búsqueda amplia custom: OR por palabras en título/descripción/handle
  try {
    const broad = await storeGet<{ products: { id: string; handle: string }[]; count: number }>(
      "/store/mt-search",
      { q: query, limit: String(LIMIT), offset: String(offset) }
    )
    if (broad.products.length > 0 || broad.count > 0) {
      // Enriquecer con precios e imágenes usando los handles encontrados
      const regionId = await getDefaultRegionId()
      const handles = broad.products.map((p) => p.handle)
      const params: Record<string, string | string[]> = {
        "handle[]": handles,
        limit: String(LIMIT),
        fields: FIELDS,
      }
      if (regionId) params.region_id = regionId
      const rich = await storeGet<{ products: Product[] }>("/store/products", params as Record<string, string>)
      // Preservar el orden de la búsqueda amplia
      const byHandle = new Map((rich.products ?? []).map((p) => [p.handle, p]))
      const ordered = handles.map((h) => byHandle.get(h)).filter(Boolean) as Product[]
      return { products: ordered, count: broad.count }
    }
  } catch {
    // fallback al buscador nativo si el endpoint custom falla
  }

  // 2. Fallback: buscador nativo de Medusa
  try {
    const regionId = await getDefaultRegionId()
    const params: Record<string, string> = {
      q: query,
      limit: String(LIMIT),
      offset: String(offset),
      fields: FIELDS,
    }
    if (regionId) params.region_id = regionId
    const data = await storeGet<{ products: Product[]; count: number }>("/store/products", params)
    return { products: data.products ?? [], count: data.count ?? 0 }
  } catch {
    return { products: [], count: 0 }
  }
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", page: pageStr } = await searchParams
  const query = q.trim()
  const page = Math.max(1, Number(pageStr) || 1)

  const { products, count } = query ? await searchProducts(query, page) : { products: [], count: 0 }
  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {query && (
        <div className="flex items-center gap-2 mb-5">
          <h1 className="text-lg font-bold text-gray-800">
            Resultados para: <span className="text-primary">&ldquo;{query}&rdquo;</span>
          </h1>
          {count > 0 && (
            <span className="text-sm text-gray-400">({count} {count === 1 ? "producto" : "productos"})</span>
          )}
        </div>
      )}

      {!query ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-base">Escribe algo arriba para encontrar productos.</p>
          <Link href="/catalogo" className="inline-block mt-4 text-sm text-primary hover:underline">
            Ver todo el catálogo →
          </Link>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-1">Sin resultados para &ldquo;{query}&rdquo;</p>
          <p className="text-gray-400 text-sm mb-5">Intenta con otras palabras o busca en el catálogo.</p>
          <Link
            href="/catalogo"
            className="inline-block px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Ver catálogo completo
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {page > 1 && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(query)}&page=${page - 1}`}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <Link
                  href={`/buscar?q=${encodeURIComponent(query)}&page=${page + 1}`}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
