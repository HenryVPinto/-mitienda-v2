import Link from "next/link"
import Image from "next/image"
import { ChevronRight } from "lucide-react"
import { notFound } from "next/navigation"
import { storeGet } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import { SortSelect } from "@/components/product/sort-select"
import type { Brand, Product } from "@/lib/types"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ page?: string; sort?: string }>
}

const LIMIT = 12

async function getBrandProducts(
  handle: string,
  page: number
): Promise<{ brand: Brand | null; products: Product[]; count: number }> {
  try {
    const offset = (page - 1) * LIMIT
    const data = await storeGet<{ brand: Brand; products: Product[]; count: number }>(
      `/store/brands/${handle}/products`,
      { limit: String(LIMIT), offset: String(offset) }
    )
    return { brand: data.brand ?? null, products: data.products ?? [], count: data.count ?? 0 }
  } catch {
    return { brand: null, products: [], count: 0 }
  }
}

export default async function MarcaPage({ params, searchParams }: Props) {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle)
  const { page: pageStr } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const { brand, products, count } = await getBrandProducts(handle, page)
  if (!brand) notFound()

  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/catalogo" className="hover:text-primary">Catálogo</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800 font-medium">{brand.name}</span>
      </nav>

      {/* Header de marca */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6 flex items-center gap-5">
        {brand.logo_url && (
          <div className="w-16 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center flex-shrink-0 p-2">
            <Image
              src={brand.logo_url}
              alt={brand.name}
              width={48}
              height={48}
              className="object-contain w-full h-full"
            />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{brand.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count} {count === 1 ? "producto" : "productos"}</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg">No hay productos de esta marca aún</p>
          <Link href="/catalogo" className="text-primary text-sm hover:underline mt-2 inline-block">
            Ver catálogo general
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {page > 1 && (
            <Link
              href={`/marca/${handle}?page=${page - 1}`}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
            >
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/marca/${handle}?page=${page + 1}`}
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
