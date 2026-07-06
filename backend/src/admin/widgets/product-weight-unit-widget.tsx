import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Select, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Props = {
  data: { id: string }
}

const UNITS = [
  { value: "g", label: "Gramos (g)" },
  { value: "kg", label: "Kilogramos (kg)" },
  { value: "lb", label: "Libras (lb)" },
  { value: "oz", label: "Onzas (oz)" },
]

const ProductWeightUnitWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [unit, setUnit] = useState("g")
  const [metadata, setMetadata] = useState<Record<string, unknown>>({})
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,metadata`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        const meta = d.product?.metadata ?? {}
        setMetadata(meta)
        setUnit((meta.weight_unit as string) ?? "g")
      })
      .catch(() => {})
  }, [productId])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...metadata, weight_unit: unit } }),
      })
      if (!res.ok) throw new Error()
      setMetadata((prev) => ({ ...prev, weight_unit: unit }))
      setEditing(false)
      toast.success("Unidad de peso guardada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const currentLabel = UNITS.find((u) => u.value === unit)?.label ?? unit

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Unidad de peso
        </Heading>
        {!editing && (
          <Button size="small" variant="transparent" onClick={() => setEditing(true)}>
            Editar
          </Button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {editing ? (
          <>
            <Select value={unit} onValueChange={setUnit}>
              <Select.Trigger>
                <Select.Value placeholder="Seleccionar unidad..." />
              </Select.Trigger>
              <Select.Content>
                {UNITS.map((u) => (
                  <Select.Item key={u.value} value={u.value}>
                    {u.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <div className="flex gap-x-2">
              <Button size="small" isLoading={saving} onClick={handleSave}>
                Guardar
              </Button>
              <Button size="small" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-ui-fg-base">
            Unidad actual: <span className="font-semibold">{currentLabel}</span>
          </p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductWeightUnitWidget
