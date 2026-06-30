import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Props = { data: { id: string } }

const ProductFeaturedWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [featured, setFeatured] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,metadata`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const meta = d.product?.metadata ?? {}
        setMetadata(meta)
        setFeatured(meta.is_featured === true || meta.is_featured === "true")
      })
      .catch(() => {})
  }, [productId])

  const toggle = async () => {
    setSaving(true)
    const next = !featured
    try {
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...metadata, is_featured: next } }),
      })
      if (!res.ok) throw new Error()
      setFeatured(next)
      setMetadata((m) => ({ ...m, is_featured: next }))
      toast.success(next ? "Producto marcado como destacado" : "Producto quitado de destacados")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h3" className="text-sm font-medium">
            Mostrar en inicio
          </Heading>
          <p className="text-ui-fg-subtle text-xs mt-0.5">
            Aparece en la sección "Productos destacados" del home.
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
            featured ? "bg-violet-600" : "bg-ui-bg-switch-off"
          }`}
          role="switch"
          aria-checked={featured}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
              featured ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductFeaturedWidget
