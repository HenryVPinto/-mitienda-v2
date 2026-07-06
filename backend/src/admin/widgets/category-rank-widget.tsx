import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Props = {
  data: { id: string }
}

const CategoryRankWidget = ({ data }: Props) => {
  const categoryId = data.id
  const base = window.location.origin

  const [rank, setRank] = useState<number | "">("")
  const [inputRank, setInputRank] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${base}/admin/product-categories/${categoryId}?fields=id,rank`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        const r = d.product_category?.rank ?? d.category?.rank
        if (r != null) {
          setRank(r)
          setInputRank(String(r))
        }
      })
      .catch(() => {})
  }, [categoryId])

  const handleSave = async () => {
    const parsed = parseInt(inputRank, 10)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Ingresa un número válido (0 o mayor)")
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/product-categories/${categoryId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rank: parsed }),
      })
      if (!res.ok) throw new Error()
      setRank(parsed)
      setEditing(false)
      toast.success("Orden guardado")
    } catch {
      toast.error("Error al guardar el orden")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Orden de categoría
        </Heading>
        {!editing && (
          <Button size="small" variant="transparent" onClick={() => { setInputRank(String(rank)); setEditing(true) }}>
            Editar
          </Button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label size="small">Posición (0 = primera)</Label>
              <Input
                size="small"
                type="number"
                min={0}
                placeholder="0"
                value={inputRank}
                onChange={(e) => setInputRank(e.target.value)}
              />
              <p className="text-xs text-ui-fg-subtle">
                Número menor aparece primero. Ej: 0, 1, 2, 3…
              </p>
            </div>
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
            Posición actual: <span className="font-semibold">{rank !== "" ? rank : "—"}</span>
          </p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.before",
})

export default CategoryRankWidget
