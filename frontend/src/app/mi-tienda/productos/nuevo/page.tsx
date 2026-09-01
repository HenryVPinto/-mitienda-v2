import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import NewProductForm from "./new-product-form"
import VendorSidebar from "../../vendor-sidebar"

const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_URL!
const VENDOR_COOKIE = "mt_vendor_token"

async function getVendor() {
  const cookieStore = await cookies()
  const token = cookieStore.get(VENDOR_COOKIE)?.value
  if (!token) return null
  try {
    const res = await fetch(`${BACKEND}/vendor/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.vendor
  } catch {
    return null
  }
}

export default async function NuevoProductoPage() {
  const vendor = await getVendor()
  if (!vendor) redirect("/mi-tienda/login")

  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar vendor={vendor} />
      <main className="flex-1 p-8">
        <div className="max-w-2xl">
          <div className="mb-6">
            <a href="/mi-tienda/productos" className="text-sm text-blue-600 hover:underline">
              ← Mis productos
            </a>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Nuevo producto</h1>
          <NewProductForm />
        </div>
      </main>
    </div>
  )
}
