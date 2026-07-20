import Link from "next/link"
import { CheckCircle2, Package, Mail, MapPin, ShoppingBag, MessageCircle } from "lucide-react"
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
  "id,display_id,status,payment_status,fulfillment_status,total,subtotal,shipping_total,email,metadata,items.*,items.title,items.thumbnail,items.quantity,items.unit_price,items.total,shipping_address.*"

const WA_NUMBER = "50258648118"

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

function buildWhatsAppUrl(displayId: string | number, total: number) {
  const text = encodeURIComponent(
    `Hola! Realicé el pedido #${displayId} por ${formatGTQ(total)}. Te envío el comprobante de depósito/transferencia.`
  )
  return `https://wa.me/${WA_NUMBER}?text=${text}`
}

function PaymentInstructions({ order }: { order: Order }) {
  const method = (order.metadata as Record<string, unknown>)?.payment_method as string | undefined

  if (method === "bank_transfer") {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-4">
        <p className="text-sm font-semibold text-amber-800 mb-2">📋 Instrucciones de pago</p>
        <p className="text-sm text-amber-700 mb-3">
          Realiza tu depósito o transferencia y envía el comprobante por WhatsApp para confirmar tu entrega.
        </p>
        <a
          href={buildWhatsAppUrl(order.display_id ?? order.id, order.total)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: "default" }),
            "bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          Enviar comprobante por WhatsApp
        </a>
      </div>
    )
  }

  if (method === "visalink") {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-xl px-5 py-4 mb-4">
        <p className="text-sm font-semibold text-purple-800 mb-1">💳 Link de pago en camino</p>
        <p className="text-sm text-purple-700">
          En breve recibirás tu link de pago vía WhatsApp (+502 5864-8118) o Messenger.
          Ten listo tu número de tarjeta de crédito o débito.
        </p>
      </div>
    )
  }

  // cash_on_delivery o sin metadata
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 mb-4">
      <p className="text-sm font-semibold text-blue-800 mb-1">🚚 Pago contra entrega</p>
      <p className="text-sm text-blue-700">
        Pagarás al recibir tu pedido. Puedes pagar en efectivo.
      </p>
    </div>
  )
}

function paymentLabel(method: string | undefined) {
  if (method === "bank_transfer") return "Depósito / Transferencia"
  if (method === "visalink") return "VisaLink / Link de pago"
  return "Contra entrega"
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

  const paymentMethod = (order.metadata as Record<string, unknown>)?.payment_method as string | undefined

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
          <p className="text-xs text-gray-500 mb-0.5">Método de pago</p>
          <span className="text-xs font-semibold bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">
            {paymentLabel(paymentMethod)}
          </span>
        </div>
      </div>

      {/* Instrucciones de pago según método */}
      <PaymentInstructions order={order} />

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
            <span>{formatGTQ(order.items.reduce((s, i) => s + i.unit_price * i.quantity, 0))}</span>
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
            {order.shipping_address.phone && <p>Tel: {order.shipping_address.phone}</p>}
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
        <Link href="/" className={cn(buttonVariants({ variant: "default" }), "flex-1 bg-primary hover:bg-primary/90 h-11 font-semibold")}>
          Seguir comprando
        </Link>
        <Link href="/catalogo" className={cn(buttonVariants({ variant: "outline" }), "flex-1 h-11")}>
          Ver catálogo
        </Link>
      </div>
    </div>
  )
}
