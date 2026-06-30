"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ChevronDown, LayoutGrid } from "lucide-react"
import type { Category } from "@/lib/types"

type Props = {
  categories: Category[]
}

export function NavCategories({ categories }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <nav className="bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-10 gap-1 text-sm">
        {/* Mi Catálogo */}
        <div
          className="relative"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <button
            onClick={() => router.push("/catalogo")}
            className="flex items-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 h-10 font-medium transition-colors"
          >
            <LayoutGrid className="w-4 h-4" />
            Mi Catálogo
            <ChevronDown className="w-3 h-3" />
          </button>

          {open && (
            <div className="absolute top-full left-0 bg-white text-gray-800 shadow-xl rounded-b-lg w-56 z-50 py-2">
              <Link
                href="/catalogo"
                className="flex items-center px-4 py-2 hover:bg-gray-50 hover:text-primary text-sm font-medium border-b border-gray-100 mb-1"
              >
                Ver todo el catálogo
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.handle}`}
                  className="flex items-center px-4 py-2 hover:bg-gray-50 hover:text-primary text-sm"
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link href="/ofertas" className="px-3 h-10 flex items-center hover:bg-primary-foreground/10 transition-colors font-medium">
          Ofertas
        </Link>
        <Link href="/emprendedores" className="px-3 h-10 flex items-center hover:bg-primary-foreground/10 transition-colors font-medium">
          Emprendedores
        </Link>
      </div>
    </nav>
  )
}
