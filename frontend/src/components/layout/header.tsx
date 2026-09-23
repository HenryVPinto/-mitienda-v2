"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { ShoppingCart, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/context/cart-context"
import { CartDrawer } from "@/components/cart/cart-drawer"

export function Header() {
  const { count } = useCart()
  const [cartOpen, setCartOpen] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/logo.png"
              alt="MiTienda"
              width={130}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Buscador — formulario nativo GET, sin estado React */}
          <form action="/buscar" method="GET" className="flex-1 flex items-center gap-2 max-w-2xl">
            <div className="relative flex-1">
              <input
                type="search"
                name="q"
                placeholder="¡Hola! ¿Qué buscas hoy?"
                autoComplete="off"
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 pr-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Acciones */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Button
              variant="ghost"
              className="relative flex items-center gap-2 px-3"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="hidden md:block text-sm font-medium">Mi Carrito</span>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
