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
      // Separate tags that already have a Medusa ID vs. newly added ones
      const existingTags = tags.filter((t) => !t.id.startsWith("new_"))
      const newTags = tags.filter((t) => t.id.startsWith("new_"))

      // For new tags: search for existing ones by value, then create missing ones
      const resolvedIds: string[] = existingTags.map((t) => t.id)

      if (newTags.length > 0) {
        // Search for existing tags matching these values (batch)
        const valueParams = newTags.map((t) => `value[]=${encodeURIComponent(t.value)}`).join("&")
        const searchRes = await fetch(
          `${base}/admin/product-tags?${valueParams}&fields=id,value&limit=50`,
          { credentials: "include" }
        )
        const searchData = await searchRes.json()
        const existingByValue = new Map<string, string>(
          (searchData.product_tags ?? []).map((t: Tag) => [t.value.toLowerCase(), t.id])
        )

        // For each new tag: use found ID or create a new tag
        for (const tag of newTags) {
          const foundId = existingByValue.get(tag.value.toLowerCase())
          if (foundId) {
            resolvedIds.push(foundId)
          } else {
            const createRes = await fetch(`${base}/admin/product-tags`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: tag.value }),
            })
            if (!createRes.ok) throw new Error(`No se pudo crear etiqueta "${tag.value}"`)
            const createData = await createRes.json()
            if (createData.product_tag?.id) resolvedIds.push(createData.product_tag.id)
          }
        }
      }

      // Update product with the resolved tag IDs
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tags: resolvedIds.map((id) => ({ id })) }),
      })
      if (!res.ok) throw new Error("Error al actualizar producto")

      // Reload tags to get fresh data from server
      const updated = await fetch(
        `${base}/admin/products/${productId}?fields=id,*tags`,
        { credentials: "include" }
      ).then((r) => r.json())
      setTags(updated.product?.tags ?? [])
      toast.success("Etiquetas guardadas")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar etiquetas"
      toast.error(msg)
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
