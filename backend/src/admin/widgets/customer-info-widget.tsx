import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useState } from "react"

type Customer = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
  metadata: Record<string, unknown> | null
}

type Props = {
  data: Customer
}

const CustomerInfoWidget = ({ data: customer }: Props) => {
  const base = window.location.origin
  const [editing, setEditing] = useState(false)
  const [nit, setNit] = useState((customer.metadata?.nit as string) ?? "")
  const [nombreComercial, setNombreComercial] = useState(
    (customer.metadata?.nombre_comercial as string) ?? ""
  )
  const [saving, setSaving] = useState(false)

  const name =
    [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
    customer.email

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/customers/${customer.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...customer.metadata,
            nit: nit.trim() || null,
            nombre_comercial: nombreComercial.trim() || null,
          },
        }),
      })
      if (!res.ok) throw new Error()
      setEditing(false)
      toast.success("Información actualizada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <Heading level="h3" className="text-sm font-medium">
            {name}
          </Heading>
          <p className="text-ui-fg-subtle text-xs mt-0.5">{customer.email}</p>
        </div>
        {!editing && (
          <Button
            size="small"
            variant="transparent"
            onClick={() => setEditing(true)}
          >
            Editar
          </Button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label size="small">NIT</Label>
              <Input
                size="small"
                placeholder="Ej: 12345678-9 o CF"
                value={nit}
                onChange={(e) => setNit(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-1">
              <Label size="small">Nombre Comercial</Label>
              <Input
                size="small"
                placeholder="Nombre del negocio"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
              />
            </div>
            <div className="flex gap-x-2">
              <Button size="small" isLoading={saving} onClick={handleSave}>
                Guardar
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ui-fg-subtle">NIT</span>
              <span className="font-medium text-ui-fg-base">
                {(customer.metadata?.nit as string) || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ui-fg-subtle">Nombre Comercial</span>
              <span className="font-medium text-ui-fg-base">
                {(customer.metadata?.nombre_comercial as string) || "—"}
              </span>
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.before",
})

export default CustomerInfoWidget
