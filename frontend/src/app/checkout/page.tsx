"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle, Truck, Building2, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { storeGet, storePost } from "@/lib/medusa"
import { formatGTQ } from "@/lib/format"
import type { ShippingOption } from "@/lib/types"

type Step = 1 | 2 | 3
type PaymentMethod = "cash_on_delivery" | "bank_transfer" | "visalink"

type AddressForm = {
  first_name: string
  last_name: string
  email: string
  phone: string
  nit: string
  departamento: string
  municipio: string
  direccion: string
  zona: string
  aldea: string
  referencia: string
}

type BankAccount = {
  id: string
  bank_name: string
  account_number: string
  account_type: string
  account_holder: string
  logo_url: string | null
  instructions: string | null
}

const EMPTY_ADDRESS: AddressForm = {
  first_name: "", last_name: "", email: "", phone: "", nit: "",
  departamento: "", municipio: "", direccion: "", zona: "", aldea: "", referencia: "",
}

const PAYMENT_OPTIONS: { id: PaymentMethod; icon: React.ReactNode; title: string; desc: string }[] = [
  { id: "cash_on_delivery", icon: <Truck className="w-5 h-5" />, title: "Contra entrega", desc: "Pagarás en efectivo al recibir tu pedido" },
  { id: "bank_transfer", icon: <Building2 className="w-5 h-5" />, title: "Depósito / Transferencia", desc: "Realiza un depósito o transferencia a nuestras cuentas bancarias" },
  { id: "visalink", icon: <CreditCard className="w-5 h-5" />, title: "VisaLink / Link de pago", desc: "Te enviaremos el link de pago por WhatsApp o Messenger" },
]

export default function CheckoutPage() {
  const { cartId, items, total, clearCart } = useCart()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [address, setAddress] = useState<AddressForm>(EMPTY_ADDRESS)
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([])
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null)
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod | null>(null)
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (selectedPayment === "bank_transfer" && banks.length === 0) {
      setLoadingBanks(true)
      storeGet<{ banks: BankAccount[] }>("/store/cms/banks")
        .then((d) => setBanks(d.banks ?? []))
        .catch(() => {})
        .finally(() => setLoadingBanks(false))
    }
  }, [selectedPayment])

  async function handleAddressSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!cartId) return
    setLoading(true)
    setError("")

    // Paso A: guardar dirección
    try {
      await storePost(`/store/carts/${cartId}`, {
        email: address.email,
        shipping_address: {
          first_name: address.first_name,
          last_name: address.last_name,
          address_1: address.direccion,
          city: address.municipio,
          province: address.departamento,
          phone: address.phone,
          country_code: "gt",
          metadata: {
            zona: address.zona || null,
            aldea: address.aldea || null,
            referencia: address.referencia || null,
            nit: address.nit || "CF",
          },
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setError(`Error al guardar dirección: ${msg}`)
      setLoading(false)
      return
    }

    // Paso B: obtener opciones de envío (custom endpoint con fallback al nativo)
    try {
      let options: ShippingOption[] = []
      try {
        const data = await storeGet<{ shipping_options: ShippingOption[]; needs_setup?: boolean }>(
          "/store/mt-shipping-options",
          { cart_id: cartId }
        )
        options = data.shipping_options ?? []
      } catch {
        // Fallback al endpoint nativo de Medusa si el custom falla
        const data = await storeGet<{ shipping_options: ShippingOption[] }>(
          "/store/shipping-options",
          { cart_id: cartId }
        )
        options = data.shipping_options ?? []
      }
      setShippingOptions(options)
      setStep(2)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido"
      setError(`Error al cargar opciones de envío: ${msg}`)
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
      await storePost(`/store/carts/${cartId}/shipping-methods`, { option_id: selectedShipping })
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al seleccionar el método de envío.")
    } finally {
      setLoading(false)
    }
  }

  async function handlePlaceOrder() {
    if (!cartId || !selectedPayment) return
    setLoading(true)
    setError("")
    try {
      // Guardar método de pago en metadata del carrito
      await storePost(`/store/carts/${cartId}`, {
        metadata: { payment_method: selectedPayment },
      })
      const data = await storePost<{ order?: { id: string } }>(
        `/store/carts/${cartId}/complete`,
        {}
      )
      const orderId = data.order?.id
      if (!orderId) throw new Error("No se pudo confirmar el pedido. Intenta de nuevo.")
      clearCart()
      router.push(`/pedido/${orderId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ocurrió un error al confirmar el pedido.")
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
              {step > s.n ? <CheckCircle2 className="w-5 h-5" /> : <Circle className={`w-5 h-5 ${step === s.n ? "fill-primary/10" : ""}`} />}
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Correo electrónico</label>
              <Input required type="email" value={address.email} onChange={(e) => setAddress((a) => ({ ...a, email: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Teléfono</label>
              <Input required type="tel" placeholder="5000-0000" value={address.phone} onChange={(e) => setAddress((a) => ({ ...a, phone: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">NIT <span className="text-gray-400 font-normal">(o CF si no tienes)</span></label>
            <Input placeholder="Ej: 12345678-9 o CF" maxLength={20} value={address.nit} onChange={(e) => setAddress((a) => ({ ...a, nit: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Departamento</label>
              <Input required placeholder="Ej: Guatemala" value={address.departamento} onChange={(e) => setAddress((a) => ({ ...a, departamento: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Municipio</label>
              <Input required placeholder="Ej: Guatemala" value={address.municipio} onChange={(e) => setAddress((a) => ({ ...a, municipio: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="text-sm text-gray-600 mb-1 block">Dirección <span className="text-gray-400 font-normal">(calle, avenida, número)</span></label>
              <Input required placeholder="Ej: 5a Av. 3-12" maxLength={60} value={address.direccion} onChange={(e) => setAddress((a) => ({ ...a, direccion: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm text-gray-600 mb-1 block">Zona</label>
              <Input placeholder="Ej: 10" maxLength={10} value={address.zona} onChange={(e) => setAddress((a) => ({ ...a, zona: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Aldea u otro <span className="text-gray-400 font-normal">(colonia, barrio, caserío…)</span></label>
            <Input placeholder="Ej: Colonia Miraflores" maxLength={60} value={address.aldea} onChange={(e) => setAddress((a) => ({ ...a, aldea: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Referencia <span className="text-gray-400 font-normal">(punto de referencia)</span></label>
            <Input placeholder="Ej: Frente al parque, casa azul" maxLength={120} value={address.referencia} onChange={(e) => setAddress((a) => ({ ...a, referencia: e.target.value }))} />
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
                  <input type="radio" name="shipping" value={opt.id} checked={selectedShipping === opt.id} onChange={() => setSelectedShipping(opt.id)} className="accent-primary" />
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
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">← Volver</Button>
            <Button type="submit" disabled={loading || !selectedShipping} className="flex-1 bg-primary hover:bg-primary/90">
              {loading ? "Procesando..." : "Continuar al pago →"}
            </Button>
          </div>
        </form>
      )}

      {/* Paso 3: Pago */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-700">Método de pago</h2>

          {/* Selector de método */}
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedPayment(opt.id)}
                className={`w-full flex items-start gap-4 p-4 border rounded-xl text-left transition-colors ${selectedPayment === opt.id ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
              >
                <div className={`mt-0.5 ${selectedPayment === opt.id ? "text-primary" : "text-gray-400"}`}>
                  {opt.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                </div>
                <div className="ml-auto mt-1">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPayment === opt.id ? "border-primary" : "border-gray-300"}`}>
                    {selectedPayment === opt.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Detalle según método seleccionado */}
          {selectedPayment === "cash_on_delivery" && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              Pagarás en efectivo cuando el repartidor entregue tu pedido.
            </div>
          )}

          {selectedPayment === "bank_transfer" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">Realiza tu depósito o transferencia a alguna de estas cuentas:</p>
              {loadingBanks ? (
                <p className="text-sm text-gray-400">Cargando cuentas...</p>
              ) : banks.length === 0 ? (
                <p className="text-sm text-gray-400">No hay cuentas disponibles en este momento.</p>
              ) : (
                <div className="space-y-2">
                  {banks.map((bank) => (
                    <div key={bank.id} className="border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                      {bank.logo_url && (
                        <img src={bank.logo_url} alt={bank.bank_name} className="h-10 w-16 object-contain flex-shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-800">{bank.bank_name}</p>
                        <p className="text-sm text-gray-600">{bank.account_type} · <span className="font-mono">{bank.account_number}</span></p>
                        <p className="text-xs text-gray-500">Titular: {bank.account_holder}</p>
                        {bank.instructions && <p className="text-xs text-amber-600 mt-1">{bank.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                Después de confirmar tu pedido, envía tu comprobante por WhatsApp al +502 5864-8118.
              </div>
            </div>
          )}

          {selectedPayment === "visalink" && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-sm text-purple-700 space-y-1">
              <p className="font-semibold">Recibirás tu link de pago por:</p>
              <p>📱 WhatsApp: +502 5864-8118</p>
              <p>💬 Messenger: página de MiTienda</p>
              <p className="text-xs text-purple-500 mt-2">Ten listo el número de tu tarjeta de crédito o débito.</p>
            </div>
          )}

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
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">← Volver</Button>
            <Button
              onClick={handlePlaceOrder}
              disabled={loading || !selectedPayment}
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
