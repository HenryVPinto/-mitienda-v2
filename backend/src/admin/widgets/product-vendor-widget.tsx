import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Select, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Vendor = {
  id: string
  name: string
  handle: string
  is_active: boolean
}

type Props = {
  data: { id: string }
}

const ProductVendorWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null)
  const [allVendors, setAllVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchCurrentVendor = async () => {
    try {
      const res = await fetch(`${base}/admin/products/${productId}/vendor`, {
        credentials: "include",
      })
      const data = await res.json()
      setCurrentVendor(data.vendor)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchAllVendors = async () => {
    try {
      const res = await fetch(`${base}/admin/vendors?limit=200`, {
        credentials: "include",
      })
      const data = await res.json()
      setAllVendors((data.vendors ?? []).filter((v: Vendor) => v.is_active))
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchCurrentVendor()
  }, [productId])

  const handleStartEdit = async () => {
    await fetchAllVendors()
    setSelectedVendorId(currentVendor?.id ?? "")
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selectedVendorId) return
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}/vendor`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_id: selectedVendorId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Vendor asignado")
      setEditing(false)
      fetchCurrentVendor()
    } catch {
      toast.error("Error al asignar vendor")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}/vendor`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success("Vendor removido")
      setCurrentVendor(null)
      setEditing(false)
    } catch {
      toast.error("Error al remover vendor")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Vendor
        </Heading>
        {!editing && !loading && (
          <Button size="small" variant="transparent" onClick={handleStartEdit}>
            {currentVendor ? "Cambiar" : "Asignar"}
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <p className="text-ui-fg-subtle text-sm">Cargando...</p>
        ) : editing ? (
          <div className="flex flex-col gap-y-2">
            <Select
              value={selectedVendorId}
              onValueChange={setSelectedVendorId}
            >
              <Select.Trigger>
                <Select.Value placeholder="Seleccionar vendor..." />
              </Select.Trigger>
              <Select.Content>
                {allVendors.map((v) => (
                  <Select.Item key={v.id} value={v.id}>
                    {v.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <div className="flex gap-x-2">
              <Button
                size="small"
                isLoading={saving}
                onClick={handleSave}
                disabled={!selectedVendorId}
              >
                Guardar
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setEditing(false)}
              >
                Cancelar
              </Button>
              {currentVendor && (
                <Button
                  size="small"
                  variant="danger"
                  isLoading={saving}
                  onClick={handleRemove}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        ) : currentVendor ? (
          <Badge color="purple" size="small">
            {currentVendor.name}
          </Badge>
        ) : (
          <p className="text-ui-fg-subtle text-sm">Sin vendor asignado</p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductVendorWidget
