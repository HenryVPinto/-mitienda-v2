"use client"

import { useRouter } from "next/navigation"
import type { VendorInfo } from "@/lib/vendor-api"
import Image from "next/image"

interface Props {
  vendor: VendorInfo
}

const navItems = [
  { label: "Inicio", href: "/mi-tienda", icon: "🏠" },
  { label: "Mis productos", href: "/mi-tienda/productos", icon: "📦" },
  { label: "Mi perfil", href: "/mi-tienda/perfil", icon: "👤" },
]

export default function VendorDashboard({ vendor }: Props) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch("/api/vendor/logout", { method: "POST" })
    router.push("/mi-tienda/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        {/* Logo / vendor info */}
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

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Logout */}
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

      {/* Main content */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido, {vendor.name}
          </h1>
          <p className="text-gray-500 mb-8">
            Desde aquí puedes gestionar tus productos en MiTienda.
          </p>

          {/* Cards de acceso rápido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/mi-tienda/productos"
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <div className="text-3xl mb-3">📦</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Mis productos
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Ver, crear y editar tu catálogo
              </p>
            </a>

            <a
              href="/mi-tienda/perfil"
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-blue-200 hover:shadow-sm transition group"
            >
              <div className="text-3xl mb-3">👤</div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">
                Mi perfil
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Actualizar logo, descripción y contacto
              </p>
            </a>
          </div>

          {/* Aviso de moderación */}
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            <strong>Nota:</strong> Los productos que subas quedarán en borrador hasta que el administrador los revise y publique.
          </div>
        </div>
      </main>
    </div>
  )
}
