import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import VendorSidebar from "../vendor-sidebar"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

async function getVendorAndProducts() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VENDOR_COOKIE)?.value
  if (!token) return null

  try {
    const [meRes, productsRes] = await Promise.all([
      fetch(`${BACKEND}/vendor/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${BACKEND}/vendor/products`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ])

    if (!meRes.ok) return null
    const { vendor } = await meRes.json()
    const { products } = productsRes.ok ? await productsRes.json() : { products: [] }
    return { vendor, products: products ?? [] }
  } catch {
    return null
  }
}

interface VariantPrice { currency_code: string; amount: number; price_list_id: string | null }
interface VariantRow { prices?: VariantPrice[]; inventory_quantity?: number; metadata?: { vendor_stock?: number } | null }

function totalStock(variants: VariantRow[]): number {
  return (variants ?? []).reduce((s, v) => {
    const stock = v.metadata?.vendor_stock ?? v.inventory_quantity ?? 0
    return s + stock
  }, 0)
}

function stockBadge(qty: number) {
  if (qty === 0) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Sin stock</span>
  if (qty <= 5) return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{qty} uds</span>
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">{qty} uds</span>
}

function priceRange(variants: VariantRow[]): string {
  const prices = variants
    .flatMap((v) => v.prices ?? [])
    .filter((p) => p.currency_code === "gtq" && !p.price_list_id)
    .map((p) => p.amount)

  if (!prices.length) return "Sin precio"
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  if (min === max) return `Q${min}`
  return `Q${min} – Q${max}`
}

export default async function ProductosPage() {
  const data = await getVendorAndProducts()
  if (!data) redirect("/mi-tienda/login")

  const { vendor, products } = data

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar vendor={vendor} />

      <main className="flex-1 p-8">
        <div className="max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis productos</h1>
              <p className="text-sm text-gray-500 mt-1">
                {products.length} producto{products.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/mi-tienda/productos/nuevo"
              className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              + Nuevo producto
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">📦</div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Aún no tienes productos
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Crea tu primer producto y el administrador lo revisará antes de publicarlo.
              </p>
              <Link
                href="/mi-tienda/productos/nuevo"
                className="inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                + Crear mi primer producto
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Variantes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product: { id: string; title: string; status: string; thumbnail: string | null; variants: VariantRow[] }) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.thumbnail ? (
                            <img
                              src={product.thumbnail}
                              alt={product.title}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-lg">
                              🖼
                            </div>
                          )}
                          <span className="font-medium text-gray-900 text-sm">
                            {product.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            product.status === "published"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {product.status === "published" ? "Publicado" : "Borrador"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {(product.variants ?? []).length}
                      </td>
                      <td className="px-6 py-4">
                        {stockBadge(totalStock(product.variants ?? []))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {priceRange(product.variants ?? [])}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/mi-tienda/productos/${product.id}`}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Editar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
