import Link from "next/link"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/lib/types"

type Props = {
  searchParams: Promise<{ page?: string }>
}

const LIMIT = 24
const FIELDS =
  "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*"

async function getOfertaProducts(page: number) {
  const offset = (page - 1) * LIMIT

  try {
    const { handles, count } = await storeGet<{ handles: string[]; count: number }>(
      "/store/mt-ofertas",
      { limit: String(LIMIT), offset: String(offset) }
    )

    if (!handles || handles.length === 0) return { products: [], count: 0 }

    const regionId = await getDefaultRegionId()
    const params: Record<string, string | string[]> = {
      "handle[]": handles,
      limit: String(LIMIT),
      fields: FIELDS,
    }
    if (regionId) params.region_id = regionId

    const rich = await storeGet<{ products: Product[] }>("/store/products", params as Record<string, string>)
    const byHandle = new Map((rich.products ?? []).map((p) => [p.handle, p]))
    const ordered = handles.map((h) => byHandle.get(h)).filter(Boolean) as Product[]

    return { products: ordered, count }
  } catch {
    return { products: [], count: 0 }
  }
}

export default async function OfertasPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const { products, count } = await getOfertaProducts(page)
  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-5">
        <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 bg-primary rounded-full inline-block" />
          Ofertas y Promociones
        </h1>
        {count > 0 && (
          <span className="text-sm text-gray-400">({count} {count === 1 ? "producto" : "productos"})</span>
        )}
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-1">No hay ofertas activas en este momento</p>
          <p className="text-gray-400 text-sm mb-5">Visita nuestro catálogo para ver todos los productos.</p>
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
                  href={`/ofertas?page=${page - 1}`}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <Link
                  href={`/ofertas?page=${page + 1}`}
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
