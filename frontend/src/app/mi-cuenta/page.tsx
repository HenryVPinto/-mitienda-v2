"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PackageSearch } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function MiCuentaPage() {
  const [orderId, setOrderId] = useState("")
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = orderId.trim()
    if (id) router.push(`/pedido/${id}`)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
        <PackageSearch className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Seguimiento de pedido</h1>
      <p className="text-gray-500 text-sm mb-8">
        Ingresa el número de tu pedido para consultar su estado. Lo encontrarás en el correo de confirmación que recibiste al comprar.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          placeholder="Número de pedido (ej. ord_01JV...)"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="h-11 text-center text-sm"
        />
        <Button
          type="submit"
          disabled={!orderId.trim()}
          className="bg-primary hover:bg-primary/90 h-11 font-semibold"
        >
          Consultar pedido
        </Button>
      </form>

      <p className="mt-8 text-xs text-gray-400">
        ¿Eres emprendedor?{" "}
        <a href="/emprendedores" className="text-primary hover:underline font-medium">
          Accede al panel de vendedores
        </a>
      </p>
    </div>
  )
}
