import Link from "next/link"
import Image from "next/image"
import { ChevronRight, FileText, Download } from "lucide-react"
import { notFound } from "next/navigation"
import { storeGet } from "@/lib/medusa"
import type { Brand, BrandCatalog } from "@/lib/types"

type Props = { params: Promise<{ handle: string }> }

async function getBrandCatalogs(handle: string) {
  try {
    const data = await storeGet<{ brand: Brand; catalogs: BrandCatalog[]; count: number }>(
      `/store/brands/${handle}/catalogs`
    )
    return { brand: data.brand ?? null, catalogs: data.catalogs ?? [], count: data.count ?? 0 }
  } catch {
    return { brand: null, catalogs: [], count: 0 }
  }
}

export default async function BrandCatalogosPage({ params }: Props) {
  const { handle } = await params
  const { brand, catalogs, count } = await getBrandCatalogs(handle)
  if (!brand) notFound()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/catalogos" className="hover:text-primary">Catálogos PDF</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800 font-medium">{brand.name}</span>
      </nav>

      <div className="bg-gray-50 rounded-xl p-6 mb-8 flex items-center gap-5">
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
          <p className="text-sm text-gray-500 mt-0.5">
            {count} {count === 1 ? "catálogo disponible" : "catálogos disponibles"}
          </p>
        </div>
      </div>

      {catalogs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg">No hay catálogos disponibles para esta marca</p>
          <Link href="/catalogos" className="text-primary text-sm hover:underline mt-2 inline-block">
            Ver todas las marcas
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {catalogs.map((catalog) => (
            <a
              key={catalog.id}
              href={catalog.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group border border-gray-200 rounded-xl overflow-hidden hover:border-primary hover:shadow-md transition-all bg-white"
            >
              {catalog.cover_image_url ? (
                <div className="aspect-[3/4] bg-gray-50 overflow-hidden">
                  <Image
                    src={catalog.cover_image_url}
                    alt={catalog.title}
                    width={300}
                    height={400}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              ) : (
                <div className="aspect-[3/4] bg-gray-50 flex items-center justify-center">
                  <FileText className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <div className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{catalog.title}</p>
                  {catalog.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{catalog.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0 w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Download className="w-3.5 h-3.5" />
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
