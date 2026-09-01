import type { VendorInfo } from "@/lib/vendor-api"
import Link from "next/link"
import VendorSidebar from "./vendor-sidebar"

interface Props {
  vendor: VendorInfo
}

export default function VendorDashboard({ vendor }: Props) {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <VendorSidebar vendor={vendor} />

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
            <Link
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
            </Link>

            <Link
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
            </Link>
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
