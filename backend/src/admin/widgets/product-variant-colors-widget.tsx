import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Variant = {
  id: string
  title: string
  metadata: Record<string, unknown> | null
}

type Props = {
  data: { id: string }
}

const ProductVariantColorsWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [variants, setVariants] = useState<Variant[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,variants.id,variants.title,variants.metadata`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        const vars: Variant[] = d.product?.variants ?? []
        setVariants(vars)
        const init: Record<string, string> = {}
        vars.forEach((v) => {
          init[v.id] = (v.metadata?.color_hex as string) ?? ""
        })
        setValues(init)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [productId])

  const reloadVariants = async () => {
    const r = await fetch(
      `${base}/admin/products/${productId}?fields=id,variants.id,variants.title,variants.metadata`,
      { credentials: "include" }
    )
    if (!r.ok) return
    const d = await r.json()
    const vars: Variant[] = d.product?.variants ?? []
    setVariants(vars)
    const updated: Record<string, string> = {}
    vars.forEach((v) => {
      updated[v.id] = (v.metadata?.color_hex as string) ?? ""
    })
    setValues(updated)
  }

  const handleSave = async (variant: Variant) => {
    setSaving(variant.id)
    try {
      const res = await fetch(`${base}/admin/products/${productId}/variants/${variant.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...variant.metadata,
            color_hex: values[variant.id] || null,
          },
        }),
      })
      if (!res.ok) throw new Error()
      await reloadVariants()
      toast.success(`Variante "${variant.title}" actualizada`)
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(null)
    }
  }

  if (loading || !variants.length) return null

  return (
    <Container className="divide-y p-0">
      <div className="px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Color por variante
        </Heading>
      </div>

      {variants.map((variant) => (
        <div key={variant.id} className="px-4 py-3 flex items-end gap-x-3">
          <div className="flex flex-col gap-y-1 flex-1">
            <Label size="small" className="text-ui-fg-subtle">
              {variant.title} — Color (hex)
            </Label>
            <div className="flex items-center gap-x-2">
              {values[variant.id] && (
                <span
                  className="w-5 h-5 rounded-full border border-ui-border-base flex-shrink-0"
                  style={{ backgroundColor: values[variant.id] }}
                />
              )}
              <Input
                size="small"
                placeholder="#FF0000"
                value={values[variant.id] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [variant.id]: e.target.value }))
                }
              />
            </div>
          </div>
          <Button
            size="small"
            isLoading={saving === variant.id}
            onClick={() => handleSave(variant)}
          >
            Guardar
          </Button>
        </div>
      ))}

      <div className="px-4 py-2">
        <p className="text-ui-fg-muted text-xs">
          Las imágenes por variante se asignan desde la sección de variantes del producto.
        </p>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductVariantColorsWidget
