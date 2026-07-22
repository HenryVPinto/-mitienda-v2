import Link from "next/link"
import { Truck, MapPin } from "lucide-react"

export function TopBar() {
  return (
    <div className="bg-gray-100 border-b border-gray-200 text-xs text-gray-600">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-8">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Truck className="w-3 h-3" />
            Envío gratis desde Q350
          </span>
          <span className="hidden sm:block">|</span>
          <span className="hidden sm:block">Pago Seguro</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/vende" className="hover:text-primary hidden sm:block">
            Vende en MiTienda
          </Link>
          <Link
            href="https://www.cargoexpreso.com/rastreo"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            <MapPin className="w-3 h-3" />
            Rastrear Mi Pedido
          </Link>
        </div>
      </div>
    </div>
  )
}
