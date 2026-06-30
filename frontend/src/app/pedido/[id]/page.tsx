import Link from "next/link"
import { CheckCircle2, Package, Mail, MapPin, ShoppingBag } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { storeGet } from "@/lib/medusa"
import { formatGTQ } from "@/lib/format"
import type { Order } from "@/lib/types"

type Props = {
  params: Promise<{ id: string }>
}

const ORDER_FIELDS =
  "id,display_id,status,payment_status,fulfillment_status,total,subtotal,shipping_total,email,items.*,items.title,items.thumbnail,items.quantity,items.unit_price,items.total,shipping_address.*"

async function getOrder(id: string): Promise<Order | null> {
  try {
    const data = await storeGet<{ order: Order }>(
      `/store/orders/${id}`,
      { fields: ORDER_FIELDS },
      { cache: "no-store" }
    )
    return data.order ?? null
  } catch {
    return null
  }
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params
  const order = await getOrder(id)

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <ShoppingBag className="w-14 h-14 text-gray-200 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-800 mb-2">Pedido no encontrado</h1>
        <p className="text-sm text-gray-500 mb-6">No pudimos cargar los detalles de tu pedido.</p>
        <Link href="/" className={cn(buttonVariants({ variant: "default" }), "bg-primary hover:bg-primary/90")}>
          Volver al inicio
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-1">¡Pedido confirmado!</h1>
        <p className="text-gray-500 text-sm">
          Gracias por tu compra. Te contactaremos para coordinar la entrega.
        </p>
      </div>

      {/* Número de orden */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-5 py-4 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Número de orden</p>
          <p className="text-lg font-bold text-primary">#{order.display_id ?? id.slice(-6).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">Estado de pago</p>
          <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            Pago contra entrega
          </span>
        </div>
      </div>

      {/* Productos */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <p className="text-sm font-semibold text-gray-700">Productos pedidos</p>
        </div>
        <div className="divide-y divide-gray-100">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-5 py-3">
              <div className="w-12 h-12 flex-shrink-0 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden">
                {item.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-contain p-1" />
                ) : (
                  <ShoppingBag className="w-5 h-5 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
              </div>
              <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                {formatGTQ(item.unit_price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Totales */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatGTQ(order.subtotal ?? order.total)}</span>
          </div>
          {(order.shipping_total ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-gray-600">
              <span>Envío</span>
              <span>{formatGTQ(order.shipping_total!)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Total a pagar</span>
            <span className="text-[var(--color-brand-orange)]">{formatGTQ(order.total)}</span>
          </div>
          <p className="text-xs text-gray-500 text-right">Se cobra al momento de la entrega</p>
        </div>
      </div>

      {/* Dirección de entrega */}
      {order.shipping_address && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Dirección de entrega
          </p>
          <div className="text-sm text-gray-600 space-y-0.5">
            <p className="font-medium text-gray-800">
              {order.shipping_address.first_name} {order.shipping_address.last_name}
            </p>
            <p>{order.shipping_address.address_1}</p>
            <p>{order.shipping_address.city}, Guatemala</p>
            {order.shipping_address.phone && (
              <p>Tel: {order.shipping_address.phone}</p>
            )}
          </div>
        </div>
      )}

      {/* Email */}
      {order.email && (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 mb-6 flex items-center gap-3">
          <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Confirmación enviada a</p>
            <p className="text-sm font-medium text-gray-700">{order.email}</p>
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "default" }), "flex-1 bg-primary hover:bg-primary/90 h-11 font-semibold")}
        >
          Seguir comprando
        </Link>
        <Link
          href="/catalogo"
          className={cn(buttonVariants({ variant: "outline" }), "flex-1 h-11")}
        >
          Ver catálogo
        </Link>
      </div>
    </div>
  )
}
