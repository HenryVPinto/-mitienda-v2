import Link from "next/link"
import Image from "next/image"
import { MapPin, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { storeGet } from "@/lib/medusa"
import type { Vendor } from "@/lib/types"

async function getVendors(): Promise<{ vendors: Vendor[]; count: number }> {
  try {
    const data = await storeGet<{ vendors: Vendor[]; count: number }>("/store/vendors", {
      limit: "48",
    })
    return { vendors: data.vendors ?? [], count: data.count ?? 0 }
  } catch {
    return { vendors: [], count: 0 }
  }
}

export default async function EmprendedoresPage() {
  const { vendors, count } = await getVendors()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white rounded-2xl p-8 mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Mercado de Emprendedores</h1>
        <p className="text-white/80 max-w-xl">
          Descubre los mejores emprendedores guatemaltecos. Apoya el comercio local y encuentra productos únicos hechos con pasión.
        </p>
        <p className="text-white/60 text-sm mt-3">{count} emprendedores activos</p>
      </div>

      {vendors.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p>No hay emprendedores registrados aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendedor/${vendor.handle}`}
              className="group flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl hover:border-primary/40 hover:shadow-md transition-all text-center"
            >
              {/* Logo */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-100 group-hover:border-primary/30 transition-colors mb-3 bg-gray-50 flex items-center justify-center flex-shrink-0">
                {vendor.logo_url ? (
                  <Image
                    src={vendor.logo_url}
                    alt={vendor.name}
                    width={64}
                    height={64}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-bold text-primary/60">
                    {vendor.name[0]}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-gray-800 leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {vendor.name}
              </h3>

              {vendor.city && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" />
                  {vendor.city}
                </p>
              )}

              <Badge className="mt-2 bg-green-50 text-green-700 border-green-100 text-xs px-1.5 py-0 gap-1">
                <ShieldCheck className="w-2.5 h-2.5" />
                Verificado
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
