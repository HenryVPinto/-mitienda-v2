import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Address = {
  id: string
  address_name: string | null
  first_name: string | null
  last_name: string | null
  phone: string | null
  address_1: string | null
  city: string | null
  province: string | null
  country_code: string | null
  metadata: Record<string, unknown> | null
}

type Customer = {
  id: string
  addresses?: Address[]
}

type Props = {
  data: Customer
}

type SlotKey = "Principal" | "Secundaria"

type FormState = {
  first_name: string
  last_name: string
  phone: string
  departamento: string
  municipio: string
  direccion: string
  zona: string
  aldea: string
  referencia: string
}

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  phone: "",
  departamento: "",
  municipio: "",
  direccion: "",
  zona: "",
  aldea: "",
  referencia: "",
}

function addressToForm(addr: Address): FormState {
  return {
    first_name: addr.first_name ?? "",
    last_name: addr.last_name ?? "",
    phone: addr.phone ?? "",
    departamento: addr.province ?? "",
    municipio: addr.city ?? "",
    direccion: addr.address_1 ?? "",
    zona: (addr.metadata?.zona as string) ?? "",
    aldea: (addr.metadata?.aldea as string) ?? "",
    referencia: (addr.metadata?.referencia as string) ?? "",
  }
}

function formatAddress(addr: Address): string {
  const parts = [
    addr.address_1,
    addr.metadata?.zona ? `Zona ${addr.metadata.zona}` : null,
    addr.metadata?.aldea,
    addr.city,
    addr.province,
  ].filter(Boolean)
  return parts.join(", ")
}

const SLOTS: SlotKey[] = ["Principal", "Secundaria"]

const CustomerAddressesWidget = ({ data: customer }: Props) => {
  const base = window.location.origin

  const [addresses, setAddresses] = useState<Address[]>(
    customer.addresses ?? []
  )
  const [editing, setEditing] = useState<SlotKey | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const reload = async () => {
    try {
      const res = await fetch(
        `${base}/admin/customers/${customer.id}?fields=id,addresses.*`,
        { credentials: "include" }
      )
      if (!res.ok) return
      const d = await res.json()
      setAddresses(d.customer?.addresses ?? [])
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    reload()
  }, [customer.id])

  const getSlotAddress = (slot: SlotKey) =>
    addresses.find((a) => a.address_name === slot) ?? null

  const startEdit = (slot: SlotKey) => {
    const addr = getSlotAddress(slot)
    setForm(addr ? addressToForm(addr) : EMPTY_FORM)
    setEditing(slot)
  }

  const cancelEdit = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSave = async (slot: SlotKey) => {
    const existing = getSlotAddress(slot)
    setSaving(true)
    try {
      const payload = {
        address_name: slot,
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        phone: form.phone.trim() || null,
        province: form.departamento.trim() || null,
        city: form.municipio.trim() || null,
        address_1: form.direccion.trim() || null,
        country_code: "gt",
        metadata: {
          zona: form.zona.trim() || null,
          aldea: form.aldea.trim() || null,
          referencia: form.referencia.trim() || null,
        },
      }

      let url = `${base}/admin/customers/${customer.id}/addresses`
      if (existing?.id) url += `/${existing.id}`

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()

      toast.success(`Dirección ${slot} guardada`)
      cancelEdit()
      await reload()
    } catch {
      toast.error("Error al guardar la dirección")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (slot: SlotKey) => {
    const addr = getSlotAddress(slot)
    if (!addr) return
    setDeleting(addr.id)
    try {
      const res = await fetch(
        `${base}/admin/customers/${customer.id}/addresses/${addr.id}`,
        { method: "DELETE", credentials: "include" }
      )
      if (!res.ok) throw new Error()
      toast.success(`Dirección ${slot} eliminada`)
      await reload()
    } catch {
      toast.error("Error al eliminar la dirección")
    } finally {
      setDeleting(null)
    }
  }

  const field = (
    label: string,
    key: keyof FormState,
    placeholder = "",
    maxLength = 80
  ) => (
    <div className="space-y-0.5">
      <Label size="small" className="text-ui-fg-subtle">
        {label}
      </Label>
      <Input
        size="small"
        placeholder={placeholder}
        maxLength={maxLength}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Direcciones de envío
        </Heading>
      </div>

      {SLOTS.map((slot) => {
        const addr = getSlotAddress(slot)
        const isEditing = editing === slot
        const isDeleting = addr ? deleting === addr.id : false

        return (
          <div key={slot} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ui-fg-base">
                {slot}
              </span>
              <div className="flex gap-x-1">
                {!isEditing && (
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => startEdit(slot)}
                  >
                    {addr ? "Editar" : "Agregar"}
                  </Button>
                )}
                {addr && !isEditing && (
                  <Button
                    size="small"
                    variant="transparent"
                    isLoading={isDeleting}
                    onClick={() => handleDelete(slot)}
                    className="text-ui-fg-error hover:text-ui-fg-error"
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>

            {/* Vista resumen */}
            {addr && !isEditing && (
              <div className="bg-ui-bg-subtle rounded-md px-3 py-2 text-xs space-y-0.5">
                {(addr.first_name || addr.last_name) && (
                  <p className="font-medium text-ui-fg-base">
                    {[addr.first_name, addr.last_name].filter(Boolean).join(" ")}
                    {addr.phone ? ` · ${addr.phone}` : ""}
                  </p>
                )}
                <p className="text-ui-fg-subtle">{formatAddress(addr)}</p>
                {addr.metadata?.referencia && (
                  <p className="text-ui-fg-muted italic">
                    Ref: {addr.metadata.referencia as string}
                  </p>
                )}
              </div>
            )}

            {!addr && !isEditing && (
              <p className="text-xs text-ui-fg-muted italic">
                Sin dirección registrada
              </p>
            )}

            {/* Formulario inline */}
            {isEditing && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  {field("Nombre", "first_name", "Nombre")}
                  {field("Apellido", "last_name", "Apellido")}
                </div>
                {field("Teléfono", "phone", "Ej: 5000-0000", 20)}
                {field("Departamento", "departamento", "Ej: Guatemala", 60)}
                {field("Municipio", "municipio", "Ej: Guatemala", 60)}
                {field("Dirección", "direccion", "Calle, avenida, número…", 60)}
                <div className="grid grid-cols-2 gap-2">
                  {field("Zona", "zona", "Ej: 10", 10)}
                  {field("Aldea u otro", "aldea", "Ej: Colonia Miraflores", 60)}
                </div>
                {field("Referencia", "referencia", "Punto de referencia…", 120)}
                <div className="flex gap-x-2 pt-1">
                  <Button
                    size="small"
                    isLoading={saving}
                    onClick={() => handleSave(slot)}
                  >
                    Guardar
                  </Button>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={cancelEdit}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "customer.details.side.before",
})

export default CustomerAddressesWidget
