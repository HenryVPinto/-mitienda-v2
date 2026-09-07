import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"

type Props = { data: { id: string } }
type Tag = { id: string; value: string }

const ProductTagsWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [tags, setTags] = useState<Tag[]>([])
  const [input, setInput] = useState("")
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,*tags`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTags(d.product?.tags ?? []))
      .catch(() => {})
  }, [productId])

  const addTag = () => {
    const vals = input
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v && !tags.find((t) => t.value.toLowerCase() === v.toLowerCase()))
    if (!vals.length) { setInput(""); return }
    const newTags: Tag[] = vals.map((v) => ({ id: `new_${Math.random()}`, value: v }))
    setTags((prev) => [...prev, ...newTags])
    setInput("")
    inputRef.current?.focus()
  }

  const removeTag = (id: string) => setTags((prev) => prev.filter((t) => t.id !== id))

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: tags.map((t) => ({ value: t.value })) }),
      })
      if (!res.ok) throw new Error()
      // Reload tags to get server-assigned IDs
      const updated = await (await fetch(`${base}/admin/products/${productId}?fields=id,*tags`, { credentials: "include" })).json()
      setTags(updated.product?.tags ?? [])
      toast.success("Etiquetas guardadas")
    } catch {
      toast.error("Error al guardar etiquetas")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">Etiquetas</Heading>
      </div>
      <div className="px-4 py-3 space-y-3">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-ui-tag-neutral-bg text-ui-tag-neutral-text text-xs rounded-md border border-ui-tag-neutral-border"
              >
                {tag.value}
                <button
                  onClick={() => removeTag(tag.id)}
                  className="ml-0.5 text-ui-fg-muted hover:text-ui-fg-base leading-none"
                  aria-label={`Eliminar etiqueta ${tag.value}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-y-1">
          <Label size="small" className="text-ui-fg-subtle">
            Agregar etiquetas (separadas por coma)
          </Label>
          <div className="flex gap-x-2">
            <Input
              ref={inputRef}
              size="small"
              placeholder="Ej: oferta, nuevo, destacado"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
            />
            <Button size="small" variant="secondary" onClick={addTag} type="button">
              +
            </Button>
          </div>
        </div>
        <Button size="small" isLoading={saving} onClick={handleSave}>
          Guardar etiquetas
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductTagsWidget
