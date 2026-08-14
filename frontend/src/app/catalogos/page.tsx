import Link from "next/link"
import Image from "next/image"
import { ChevronRight, FileText } from "lucide-react"
import { storeGet } from "@/lib/medusa"
import type { Brand } from "@/lib/types"

async function getBrandsWithCatalogs(): Promise<Brand[]> {
  try {
    const data = await storeGet<{ brands: Brand[] }>("/store/catalogs")
    return data.brands ?? []
  } catch {
    return []
  }
}

export default async function CatalogosPage() {
  const brands = await getBrandsWithCatalogs()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800 font-medium">Catálogos PDF</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Catálogos PDF</h1>
        <p className="text-gray-500 text-sm mt-1">Descarga los catálogos de tus marcas favoritas</p>
      </div>

      {brands.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No hay catálogos disponibles aún</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.id}
              href={`/catalogos/${brand.handle}`}
              className="group border border-gray-200 rounded-xl p-5 flex flex-col items-center gap-3 hover:border-primary hover:shadow-md transition-all bg-white"
            >
              <div className="w-16 h-16 flex items-center justify-center">
                {brand.logo_url ? (
                  <Image
                    src={brand.logo_url}
                    alt={brand.name}
                    width={64}
                    height={64}
                    className="object-contain w-full h-full"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                    <FileText className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-gray-700 text-center group-hover:text-primary transition-colors">
                {brand.name}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
