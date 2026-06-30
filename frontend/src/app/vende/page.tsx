"use client"

import { useState } from "react"
import { Store, TrendingUp, Users, ShieldCheck, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const BENEFITS = [
  {
    icon: <Store className="w-6 h-6 text-primary" />,
    title: "Tu tienda en línea",
    desc: "Crea tu perfil de vendedor y empieza a vender desde el primer día, sin conocimientos técnicos.",
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-primary" />,
    title: "Llega a más clientes",
    desc: "Miles de compradores en Guatemala visitan MiTienda cada día buscando productos como los tuyos.",
  },
  {
    icon: <Users className="w-6 h-6 text-primary" />,
    title: "Comunidad de emprendedores",
    desc: "Únete a nuestra red de emprendedores guatemaltecos y haz crecer tu negocio con nosotros.",
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-primary" />,
    title: "Ventas seguras",
    desc: "Plataforma segura con herramientas de gestión de pedidos, inventario y clientes.",
  },
]

type FormState = {
  name: string
  contact_email: string
  contact_phone: string
  city: string
  description: string
}

const EMPTY: FormState = {
  name: "",
  contact_email: "",
  contact_phone: "",
  city: "",
  description: "",
}

export default function VendePage() {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_URL}/store/vendor-applications`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!,
          },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.message ?? "Error al enviar la solicitud")
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">¡Solicitud enviada!</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          Recibimos tu solicitud para ser vendedor en MiTienda. Nuestro equipo la revisará y te contactaremos al correo{" "}
          <span className="font-medium text-gray-700">{form.contact_email}</span> en los próximos días hábiles.
        </p>
        <button
          onClick={() => { setForm(EMPTY); setSubmitted(false) }}
          className="text-sm text-primary hover:underline"
        >
          Enviar otra solicitud
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <span className="inline-block bg-primary/10 text-primary text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
          Para emprendedores
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4 leading-tight">
          Vende en MiTienda y lleva tu negocio al siguiente nivel
        </h1>
        <p className="text-gray-500 text-base max-w-xl mx-auto">
          Más de miles de guatemaltecos compran en MiTienda. Regístrate como vendedor y empieza a recibir pedidos hoy.
        </p>
      </div>

      {/* Beneficios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex gap-4 p-5 border border-gray-200 rounded-xl hover:border-primary/30 transition-colors">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              {b.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800 mb-1">{b.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Formulario de solicitud */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm" id="formulario">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-1">Solicita ser vendedor</h2>
          <p className="text-sm text-gray-500">
            Completa el formulario y nuestro equipo revisará tu solicitud. Te contactaremos en menos de 48 horas.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Nombre del negocio <span className="text-red-500">*</span>
              </label>
              <Input
                required
                placeholder="Ej: Distribuidora Central"
                value={form.name}
                onChange={set("name")}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Correo electrónico <span className="text-red-500">*</span>
              </label>
              <Input
                required
                type="email"
                placeholder="tu@correo.com"
                value={form.contact_email}
                onChange={set("contact_email")}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Teléfono / WhatsApp
              </label>
              <Input
                type="tel"
                placeholder="+502 5555-1234"
                value={form.contact_phone}
                onChange={set("contact_phone")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Ciudad
              </label>
              <Input
                placeholder="Ej: Guatemala"
                value={form.city}
                onChange={set("city")}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                ¿Qué productos vendes?
              </label>
              <textarea
                rows={3}
                placeholder="Ej: Ropa para dama, accesorios y bolsos importados..."
                value={form.description}
                onChange={set("description")}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 h-12 text-base font-semibold"
          >
            {loading ? "Enviando solicitud..." : "Enviar solicitud"}
          </Button>

          <p className="text-xs text-gray-400 text-center">
            Al enviar esta solicitud aceptas nuestros términos y condiciones. No spameamos.
          </p>
        </form>
      </div>
    </div>
  )
}
