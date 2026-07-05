import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MapPin, Mail, Phone, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { storeGet } from "@/lib/medusa"
import { ProductCard } from "@/components/product/product-card"
import type { Vendor, Product } from "@/lib/types"

type Props = {
  params: Promise<{ handle: string }>
  searchParams: Promise<{ category?: string; page?: string }>
}

const LIMIT = 12

async function getVendor(handle: string): Promise<Vendor | null> {
  try {
    const data = await storeGet<{ vendor: Vendor }>(`/store/vendors/${handle}`)
    return data.vendor
  } catch {
    return null
  }
}

async function getVendorProducts(
  handle: string,
  page: number
): Promise<{ products: Product[]; count: number }> {
  try {
    const data = await storeGet<{ products: Product[]; count: number }>(
      `/store/vendors/${handle}/products`,
      {
        limit: String(LIMIT),
        offset: String((page - 1) * LIMIT),
      }
    )
    return { products: data.products ?? [], count: data.count ?? 0 }
  } catch {
    return { products: [], count: 0 }
  }
}

export default async function VendorPage({ params, searchParams }: Props) {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle)
  const { page: pageStr } = await searchParams
  const page = Math.max(1, Number(pageStr) || 1)

  const vendor = await getVendor(handle)
  if (!vendor) notFound()

  const { products, count } = await getVendorProducts(handle, page)
  const totalPages = Math.ceil(count / LIMIT)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Perfil del vendedor */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
        {/* Banner / header */}
        <div className="h-32 bg-gradient-to-r from-primary/80 to-primary relative">
          <div className="absolute bottom-0 left-6 translate-y-1/2">
            <div className="w-20 h-20 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
              {vendor.logo_url ? (
                <Image
                  src={vendor.logo_url}
                  alt={vendor.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl">
                  {vendor.name[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 pt-12 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-xl font-bold text-gray-800">{vendor.name}</h1>
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs gap-1">
                <ShieldCheck className="w-3 h-3" />
                Tienda Verificada
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
              {vendor.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {vendor.city}, Guatemala
                </span>
              )}
              <span className="text-xs">{count} productos</span>
            </div>

            {vendor.description && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1">
                  Nuestra Historia
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">{vendor.description}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {vendor.contact_email && (
              <a href={`mailto:${vendor.contact_email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
                <Mail className="w-4 h-4" />{vendor.contact_email}
              </a>
            )}
            {vendor.contact_phone && (
              <a href={`tel:${vendor.contact_phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
                <Phone className="w-4 h-4" />{vendor.contact_phone}
              </a>
            )}
            <a
              href={`mailto:${vendor.contact_email ?? ""}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Contactar
            </a>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">
          Todos los Productos ({count})
        </h2>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>Este vendedor aún no tiene productos publicados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          {page > 1 && (
            <Link href={`/vendedor/${handle}?page=${page - 1}`} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors">
              ← Anterior
            </Link>
          )}
          <span className="text-sm text-gray-500">Página {page} de {totalPages}</span>
          {page < totalPages && (
            <Link href={`/vendedor/${handle}?page=${page + 1}`} className="px-4 py-2 border border-gray-200 rounded-lg text-sm hover:border-primary hover:text-primary transition-colors">
              Siguiente →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
