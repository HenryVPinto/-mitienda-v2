import Link from "next/link"
import { redirect } from "next/navigation"
import {
  Laptop, Home, Shirt, Baby, Dumbbell, ShoppingBasket, PawPrint, Wrench,
  Smartphone, Book, Music, Gamepad2, Car, Flower2, Utensils, Heart, Gem,
  Briefcase, Camera, Gift, Tag,
} from "lucide-react"
import type { LucideProps } from "lucide-react"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import { SortSelect } from "@/components/product/sort-select"
import type { Product, Category } from "@/lib/types"

type IconComponent = React.ComponentType<LucideProps>

const ICON_MAP: Record<string, IconComponent> = {
  laptop: Laptop, smartphone: Smartphone, home: Home, shirt: Shirt,
  baby: Baby, dumbbell: Dumbbell, "shopping-basket": ShoppingBasket,
  "paw-print": PawPrint, wrench: Wrench, book: Book, music: Music,
  "gamepad-2": Gamepad2, car: Car, "flower-2": Flower2, utensils: Utensils,
  heart: Heart, gem: Gem, briefcase: Briefcase, camera: Camera, gift: Gift, tag: Tag,
}

const HANDLE_ICON_MAP: Record<string, IconComponent> = {
  tecnologia: Laptop, hogar: Home, moda: Shirt, bebes: Baby,
  deportes: Dumbbell, supermercado: ShoppingBasket, mascotas: PawPrint, ferreteria: Wrench,
}

function getCategoryIcon(cat: Category): React.ReactNode {
  const iconName = cat.metadata?.icon as string | undefined
  const Icon = (iconName && ICON_MAP[iconName]) || HANDLE_ICON_MAP[cat.handle] || ShoppingBasket
  return <Icon className="w-4 h-4 flex-shrink-0" />
}

type Props = {
  searchParams: Promise<{ page?: string; sort?: string; category?: string }>
}

const LIMIT = 12

async function getProducts(page: number, sort: string) {
  const regionId = await getDefaultRegionId()
  const params: Record<string, string> = {
    limit: String(LIMIT),
    offset: String((page - 1) * LIMIT),
    fields:
      "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*",
  }
  if (regionId) params.region_id = regionId
  if (sort === "price_asc") params.order = "variants.prices.amount"
  if (sort === "price_desc") params.order = "-variants.prices.amount"

  try {
    const data = await storeGet<{ products: Product[]; count: number }>("/store/products", params)
    return { products: data.products ?? [], count: data.count ?? 0 }
  } catch {
    return { products: [], count: 0 }
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const data = await storeGet<{ product_categories: Category[] }>(
      "/store/product-categories",
      { parent_category_id: "null", limit: "20", fields: "id,name,handle,description,metadata,rank" }
    )
    const cats = data.product_categories ?? []
    return cats.sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  } catch {
    return []
  }
}

export default async function CatalogoPage({ searchParams }: Props) {
  const { page: pageStr, sort = "relevance", category } = await searchParams

  // Legacy links with ?category= redirect to the dedicated category page
  if (category) redirect(`/categoria/${category}`)

  const page = Math.max(1, Number(pageStr) || 1)

  const [{ products, count }, categories] = await Promise.all([
    getProducts(page, sort),
    getCategories(),
  ])

  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-start gap-6">
        {/* Sidebar de categorías */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Categorías</h2>
          <ul className="space-y-1">
            <li>
              <Link
                href="/catalogo"
                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${!category ? "bg-primary/10 text-primary font-medium" : "text-gray-600 hover:bg-gray-50"}`}
              >
                Todos los productos
              </Link>
            </li>
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/categoria/${cat.handle}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-600 hover:bg-gray-50"
                >
                  {getCategoryIcon(cat)}
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </aside>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-800">Catálogo general</h1>
              <p className="text-sm text-gray-500 mt-0.5">{count} productos</p>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Ordenar por:</label>
              <SortSelect current={sort} basePath="/catalogo" />
            </div>
          </div>

          {/* Filtros de categoría en mobile */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 lg:hidden">
            <Link
              href="/catalogo"
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${!category ? "bg-primary text-white border-primary" : "border-gray-200 text-gray-600 hover:border-primary"}`}
            >
              Todos
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categoria/${cat.handle}`}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors border-gray-200 text-gray-600 hover:border-primary"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {products.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p>No hay productos disponibles.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              {page > 1 && (
                <Link
                  href={`/catalogo?page=${page - 1}&sort=${sort}${category ? `&category=${category}` : ""}`}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
              {page < totalPages && (
                <Link
                  href={`/catalogo?page=${page + 1}&sort=${sort}${category ? `&category=${category}` : ""}`}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors"
                >
                  Siguiente →
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
