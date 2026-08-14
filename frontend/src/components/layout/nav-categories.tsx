"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronDown, LayoutGrid, Menu, X } from "lucide-react"
import type { Category } from "@/lib/types"

type Props = {
  categories: Category[]
}

export function NavCategories({ categories }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileCatOpen, setMobileCatOpen] = useState(false)

  const closeAll = () => {
    setMobileOpen(false)
    setMobileCatOpen(false)
    setDropdownOpen(false)
  }

  return (
    <nav className="bg-primary text-white relative z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-10 gap-1 text-sm">

        {/* Desktop: links horizontales */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {/* Mi Catálogo dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setDropdownOpen(true)}
            onMouseLeave={() => setDropdownOpen(false)}
          >
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 px-3 h-10 font-medium transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Mi Catálogo
              <ChevronDown className="w-3 h-3" />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 bg-white text-gray-800 shadow-xl rounded-b-lg w-56 z-50 py-2">
                <Link
                  href="/catalogo"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center px-4 py-2 hover:bg-gray-50 hover:text-primary text-sm font-medium border-b border-gray-100 mb-1"
                >
                  Ver todo el catálogo
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.handle}`}
                    onClick={() => setDropdownOpen(false)}
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
          <Link href="/catalogos" className="px-3 h-10 flex items-center hover:bg-primary-foreground/10 transition-colors font-medium">
            Catálogos PDF
          </Link>
          <Link href="/emprendedores" className="px-3 h-10 flex items-center hover:bg-primary-foreground/10 transition-colors font-medium">
            Emprendedores
          </Link>
        </div>

        {/* Mobile: botón hamburguesa */}
        <div className="flex md:hidden items-center flex-1 justify-between">
          <span className="font-medium text-sm flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Menú
          </span>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="p-1 hover:bg-primary-foreground/10 rounded transition-colors"
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile: menú desplegable */}
      {mobileOpen && (
        <div className="md:hidden bg-primary border-t border-primary-foreground/20">
          {/* Mi Catálogo con subcategorías */}
          <div>
            <button
              onClick={() => setMobileCatOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-foreground/10 transition-colors font-medium text-sm"
            >
              <span className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Mi Catálogo
              </span>
              <ChevronDown className={`w-4 h-4 transition-transform ${mobileCatOpen ? "rotate-180" : ""}`} />
            </button>

            {mobileCatOpen && (
              <div className="bg-primary-foreground/10">
                <Link
                  href="/catalogo"
                  onClick={closeAll}
                  className="flex items-center px-8 py-2.5 hover:bg-primary-foreground/10 text-sm font-medium"
                >
                  Ver todo el catálogo
                </Link>
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categoria/${cat.handle}`}
                    onClick={closeAll}
                    className="flex items-center px-8 py-2.5 hover:bg-primary-foreground/10 text-sm"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/ofertas"
            onClick={closeAll}
            className="flex items-center px-4 py-3 hover:bg-primary-foreground/10 transition-colors font-medium text-sm border-t border-primary-foreground/10"
          >
            Ofertas
          </Link>
          <Link
            href="/catalogos"
            onClick={closeAll}
            className="flex items-center px-4 py-3 hover:bg-primary-foreground/10 transition-colors font-medium text-sm border-t border-primary-foreground/10"
          >
            Catálogos PDF
          </Link>
          <Link
            href="/emprendedores"
            onClick={closeAll}
            className="flex items-center px-4 py-3 hover:bg-primary-foreground/10 transition-colors font-medium text-sm border-t border-primary-foreground/10"
          >
            Emprendedores
          </Link>
        </div>
      )}
    </nav>
  )
}
