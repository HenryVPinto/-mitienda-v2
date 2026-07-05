import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import { SortSelect } from "@/components/product/sort-select"
import type { Category, Product } from "@/lib/types"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ page?: string; sort?: string; min?: string; max?: string }>
}

const LIMIT = 12

async function getCategory(handle: string): Promise<Category | null> {
  try {
    const data = await storeGet<{ product_categories: Category[] }>(
      "/store/product-categories",
      { handle }
    )
    return data.product_categories?.[0] ?? null
  } catch {
    return null
  }
}

async function getProducts(
  categoryId: string,
  page: number,
  sort: string
): Promise<{ products: Product[]; count: number }> {
  const regionId = await getDefaultRegionId()
  const offset = (page - 1) * LIMIT
  const params: Record<string, string> = {
    "category_id[]": categoryId,
    limit: String(LIMIT),
    offset: String(offset),
    fields:
      "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*",
  }
  if (regionId) params.region_id = regionId
  if (sort === "price_asc") params.order = "variants.prices.amount"
  if (sort === "price_desc") params.order = "-variants.prices.amount"

  try {
    const data = await storeGet<{ products: Product[]; count: number }>(
      "/store/products",
      params
    )
    return { products: data.products ?? [], count: data.count ?? 0 }
  } catch {
    return { products: [], count: 0 }
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle)
  const { page: pageStr, sort = "relevance" } = await searchParams

  const page = Math.max(1, Number(pageStr) || 1)

  const category = await getCategory(handle)
  if (!category) notFound()

  const { products, count } = await getProducts(category.id, page, sort)

  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800 font-medium">{category.name}</span>
      </nav>

      {/* Header de categoría */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{category.name}</h1>
        {category.description && (
          <p className="text-gray-500 text-sm mt-1 max-w-xl">{category.description}</p>
        )}
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <p className="text-sm text-gray-500">
          {count} {count === 1 ? "resultado" : "resultados"} para <strong>{category.name}</strong>
        </p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ordenar por:</label>
          <SortSelect current={sort} handle={handle} />
        </div>
      </div>

      {/* Grid */}
      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay productos en esta categoría</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              href={`/categoria/${handle}?page=${page - 1}&sort=${sort}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-500">
            Página {page} de {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/categoria/${handle}?page=${page + 1}&sort=${sort}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
            >
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

