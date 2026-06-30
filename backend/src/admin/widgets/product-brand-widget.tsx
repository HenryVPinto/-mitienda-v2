import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Select, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Brand = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  is_active: boolean
}

type Props = {
  data: { id: string }
}

const ProductBrandWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)
  const [allBrands, setAllBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [selectedBrandId, setSelectedBrandId] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchCurrentBrand = async () => {
    try {
      const res = await fetch(`${base}/admin/products/${productId}/brand`, {
        credentials: "include",
      })
      const data = await res.json()
      setCurrentBrand(data.brand)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchAllBrands = async () => {
    try {
      const res = await fetch(`${base}/admin/brands?limit=200`, {
        credentials: "include",
      })
      const data = await res.json()
      setAllBrands((data.brands ?? []).filter((b: Brand) => b.is_active))
    } catch {
      // silently ignore
    }
  }

  useEffect(() => {
    fetchCurrentBrand()
  }, [productId])

  const handleStartEdit = async () => {
    await fetchAllBrands()
    setSelectedBrandId(currentBrand?.id ?? "")
    setEditing(true)
  }

  const handleSave = async () => {
    if (!selectedBrandId) return
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}/brand`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand_id: selectedBrandId }),
      })
      if (!res.ok) throw new Error()
      toast.success("Marca asignada")
      setEditing(false)
      fetchCurrentBrand()
    } catch {
      toast.error("Error al asignar marca")
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}/brand`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error()
      toast.success("Marca removida")
      setCurrentBrand(null)
      setEditing(false)
    } catch {
      toast.error("Error al remover marca")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Marca
        </Heading>
        {!editing && !loading && (
          <Button size="small" variant="transparent" onClick={handleStartEdit}>
            {currentBrand ? "Cambiar" : "Asignar"}
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <p className="text-ui-fg-subtle text-sm">Cargando...</p>
        ) : editing ? (
          <div className="flex flex-col gap-y-2">
            <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
              <Select.Trigger>
                <Select.Value placeholder="Seleccionar marca..." />
              </Select.Trigger>
              <Select.Content>
                {allBrands.map((b) => (
                  <Select.Item key={b.id} value={b.id}>
                    <div className="flex items-center gap-x-2">
                      {b.logo_url && (
                        <img
                          src={b.logo_url}
                          alt={b.name}
                          className="h-5 w-5 object-contain rounded"
                        />
                      )}
                      {b.name}
                    </div>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <div className="flex gap-x-2">
              <Button
                size="small"
                isLoading={saving}
                onClick={handleSave}
                disabled={!selectedBrandId}
              >
                Guardar
              </Button>
              <Button size="small" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              {currentBrand && (
                <Button size="small" variant="danger" isLoading={saving} onClick={handleRemove}>
                  Quitar
                </Button>
              )}
            </div>
          </div>
        ) : currentBrand ? (
          <div className="flex items-center gap-x-3">
            {currentBrand.logo_url ? (
              <img
                src={currentBrand.logo_url}
                alt={currentBrand.name}
                className="h-10 w-10 object-contain rounded border border-ui-border-base bg-white p-1"
              />
            ) : (
              <div className="h-10 w-10 rounded border border-ui-border-base bg-ui-bg-subtle flex items-center justify-center text-ui-fg-muted text-xs">
                {currentBrand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-medium">{currentBrand.name}</span>
          </div>
        ) : (
          <p className="text-ui-fg-subtle text-sm">Sin marca asignada</p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductBrandWidget
