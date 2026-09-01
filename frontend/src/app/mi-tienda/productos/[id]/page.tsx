import { cookies } from "next/headers"
import { redirect, notFound } from "next/navigation"
import VendorSidebar from "../../vendor-sidebar"
import ProductEditor from "./product-editor"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

async function getData(productId: string): Promise<{ vendor: any; product: any } | { notFound: true } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(VENDOR_COOKIE)?.value
  if (!token) return null

  try {
    const [meRes, productRes] = await Promise.all([
      fetch(`${BACKEND}/vendor/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
      fetch(`${BACKEND}/vendor/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      }),
    ])

    if (!meRes.ok) return null
    if (!productRes.ok) return { notFound: true }

    const { vendor } = await meRes.json()
    const { product } = await productRes.json()

    return { vendor, product }
  } catch {
    return null
  }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getData(id)

  if (!data) redirect("/mi-tienda/login")
  if ((data as any).notFound) notFound()

  const { vendor, product } = data as any

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar vendor={vendor} />
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-3xl">
          <div className="mb-6">
            <a href="/mi-tienda/productos" className="text-sm text-blue-600 hover:underline">
              ← Mis productos
            </a>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{product.title}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                product.status === "published"
                  ? "bg-green-100 text-green-700"
                  : "bg-yellow-100 text-yellow-700"
              }`}
            >
              {product.status === "published" ? "Publicado" : "Borrador"}
            </span>
          </div>
          <ProductEditor product={product} />
        </div>
      </main>
    </div>
  )
}
