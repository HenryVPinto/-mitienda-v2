"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { storeGet, storePost } from "@/lib/medusa"
import { formatGTQ } from "@/lib/format"
import type { ShippingOption } from "@/lib/types"

type Step = 1 | 2 | 3

type AddressForm = {
  first_name: string
  last_name: string
  address_1: string
  city: string
  phone: string
  email: string
}

const EMPTY_ADDRESS: AddressForm = {
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  phone: "",
  email: "",
}

export default function CheckoutPage() {
  const { cartId, items, total, clearCart } = useCart()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cartId) return
    setLoading(true)
    setError("")
    try {
      await storePost(`/store/carts/${cartId}`, {
        email: address.email,
        shipping_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.address_1,
          city: address.city,
          phone: address.phone,
          country_code: "gt",
        },
      })
      const data = await storeGet<{ shipping_options: ShippingOption[] }>(
        "/store/shipping-options",
        { cart_id: cartId }
      )
      setShippingOptions(data.shipping_options ?? [])
      setStep(2)
    } catch {
      setError("Error al guardar la dirección. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  async function handleShippingSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cartId || !selectedShipping) return
    setLoading(true)
    setError("")
    try {
      await storePost(`/store/carts/${cartId}/shipping-methods`, {
        option_id: selectedShipping,
      })
      const pcData = await storePost<{ payment_collection: { id: string } }>(
        "/store/payment-collections",
        { cart_id: cartId }
      )
      const pcId = pcData.payment_collection?.id
      if (pcId) {
        await storePost(`/store/payment-collections/${pcId}/payment-sessions`, {
          provider_id: "pp_system_default",
        })
      }
      setStep(3)
    } catch {
      setError("Error al seleccionar envío.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePlaceOrder() {
    if (!cartId) return
    setLoading(true)
    setError("")
    try {
      const data = await storePost<{ order?: { id: string }; type?: string }>(
        `/store/carts/${cartId}/complete`,
        {}
      )
      const orderId = data.order?.id
      if (!orderId) throw new Error("No se pudo confirmar el pedido. Intenta de nuevo.")
      clearCart()
      router.push(`/pedido/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al confirmar el pedido. Intenta de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { n: 1, label: "Dirección" },
    { n: 2, label: "Envío" },
    { n: 3, label: "Pago" },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 text-sm font-medium ${step >= s.n ? "text-primary" : "text-gray-400"}`}>
              {step > s.n ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Circle className={`w-5 h-5 ${step === s.n ? "fill-primary/10" : ""}`} />
              )}
              {s.label}
            </div>
            {i < steps.length - 1 && <div className="flex-1 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Paso 1: Dirección */}
      {step === 1 && (
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Dirección de envío</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Nombre</label>
              <Input required value={address.first_name} onChange={(e) => setAddress((a) => ({ ...a, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Apellido</label>
              <Input required value={address.last_name} onChange={(e) => setAddress((a) => ({ ...a, last_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Dirección</label>
            <Input required value={address.address_1} onChange={(e) => setAddress((a) => ({ ...a, address_1: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Ciudad</label>
              <Input required value={address.city} onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Teléfono</label>
              <Input required type="tel" value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Correo electrónico</label>
            <Input required type="email" value={address.email} onChange={(e) => setAddress((a) => ({ ...a, email: e.target.value }))} />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 h-11">
            {loading ? "Guardando..." : "Continuar al envío →"}
          </Button>
        </form>
      )}

      {/* Paso 2: Envío */}
      {step === 2 && (
        <form onSubmit={handleShippingSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Método de envío</h2>
          {shippingOptions.length === 0 ? (
            <p className="text-sm text-gray-500">No hay opciones de envío disponibles.</p>
          ) : (
            <div className="space-y-2">
              {shippingOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${selectedShipping === opt.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    value={opt.id}
                    checked={selectedShipping === opt.id}
                    onChange={() => setSelectedShipping(opt.id)}
                    className="accent-primary"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{opt.name}</p>
                  </div>
                  <p className="text-sm font-bold text-[var(--color-brand-orange)]">
                    {opt.amount === 0 ? "Gratis" : formatGTQ(opt.amount)}
                  </p>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
              ← Volver
            </Button>
            <Button type="submit" disabled={loading || !selectedShipping} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Procesando..." : "Continuar al pago →"}
            </Button>
          </div>
        </form>
      )}

      {/* Paso 3: Pago */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Pago contra entrega</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-gray-600">
              El pago se realiza al momento de recibir tu pedido. Puedes pagar en efectivo o con tarjeta al repartidor.
            </p>
          </div>

          <Separator />

          {/* Resumen */}
          <div className="space-y-2 text-sm">
            <h3 className="font-semibold text-gray-700">Resumen del pedido</h3>
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-gray-600">
                <span className="truncate flex-1 mr-2">{item.title} × {item.quantity}</span>
                <span>{formatGTQ(item.unit_price * item.quantity)}</span>
              </div>
            ))}
            <Separator />
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span className="text-[var(--color-brand-orange)]">{formatGTQ(total)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
              ← Volver
            </Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 h-11 font-semibold"
            >
              {loading ? "Procesando..." : "Confirmar pedido"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
