"use client"

import Link from "next/link"
import Image from "next/image"
import { useRouter, usePathname } from "next/navigation"
import type { VendorInfo } from "@/lib/vendor-api"

const navItems = [
  { label: "Inicio", href: "/mi-tienda", icon: "🏠" },
  { label: "Mis productos", href: "/mi-tienda/productos", icon: "📦" },
  { label: "Mi perfil", href: "/mi-tienda/perfil", icon: "👤" },
]

export default function VendorSidebar({ vendor }: { vendor: VendorInfo }) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await fetch("/api/vendor/logout", { method: "POST" })
    router.push("/mi-tienda/login")
    router.refresh()
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {vendor.logo_url ? (
            <Image
              src={vendor.logo_url}
              alt={vendor.name}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
              {vendor.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{vendor.name}</p>
            <p className="text-xs text-gray-500 truncate">Portal Emprendedor</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/mi-tienda"
              ? pathname === "/mi-tienda"
              : pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-blue-600"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
