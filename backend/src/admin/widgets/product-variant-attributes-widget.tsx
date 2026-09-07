import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Props = { data: { id: string } }

type Fields = {
  weight: string
  width: string
  length: string
  height: string
  mid_code: string
  hs_code: string
}

const empty: Fields = { weight: "", width: "", length: "", height: "", mid_code: "", hs_code: "" }

const ProductVariantAttributesWidget = ({ data }: Props) => {
  const variantId = data.id
  const base = window.location.origin

  // Extract productId from URL: /products/:productId/variants/:variantId
  const parts = window.location.pathname.split("/")
  const prodIdx = parts.findIndex((p) => p === "products")
  const productId = prodIdx !== -1 ? parts[prodIdx + 1] : null

  const [fields, setFields] = useState<Fields>(empty)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!productId) return
    fetch(
      `${base}/admin/products/${productId}?fields=id,variants.id,variants.weight,variants.width,variants.length,variants.height,variants.mid_code,variants.hs_code`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => {
        const variant = (d.product?.variants ?? []).find((v: any) => v.id === variantId)
        if (variant) {
          setFields({
            weight: variant.weight?.toString() ?? "",
            width: variant.width?.toString() ?? "",
            length: variant.length?.toString() ?? "",
            height: variant.height?.toString() ?? "",
            mid_code: variant.mid_code ?? "",
            hs_code: variant.hs_code ?? "",
          })
        }
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [variantId, productId])

  const handleSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      const body: Record<string, any> = {}
      if (fields.weight !== "") body.weight = Number(fields.weight)
      if (fields.width !== "") body.width = Number(fields.width)
      if (fields.length !== "") body.length = Number(fields.length)
      if (fields.height !== "") body.height = Number(fields.height)
      if (fields.mid_code !== "") body.mid_code = fields.mid_code
      if (fields.hs_code !== "") body.hs_code = fields.hs_code

      const res = await fetch(`${base}/admin/products/${productId}/variants/${variantId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success("Atributos guardados")
    } catch {
      toast.error("Error al guardar atributos")
    } finally {
      setSaving(false)
    }
  }

  if (!loaded || !productId) return null

  const numField = (key: keyof Fields, label: string, placeholder: string) => (
    <div className="flex flex-col gap-y-1">
      <Label size="small" className="text-ui-fg-subtle">{label}</Label>
      <Input
        size="small"
        type="number"
        min={0}
        placeholder={placeholder}
        value={fields[key]}
        onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  )

  const textField = (key: keyof Fields, label: string, placeholder: string) => (
    <div className="flex flex-col gap-y-1">
      <Label size="small" className="text-ui-fg-subtle">{label}</Label>
      <Input
        size="small"
        placeholder={placeholder}
        value={fields[key]}
        onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">Atributos físicos</Heading>
      </div>
      <div className="px-4 py-3 space-y-3">
        {numField("weight", "Peso (g)", "0")}
        {numField("width", "Ancho (cm)", "0")}
        {numField("length", "Largo (cm)", "0")}
        {numField("height", "Altura (cm)", "0")}
        {textField("mid_code", "Código MID", "Ej: MID123")}
        {textField("hs_code", "Código HS", "Ej: 8471.30")}
        <Button size="small" isLoading={saving} onClick={handleSave}>
          Guardar atributos
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.variant.details.side.before",
})

export default ProductVariantAttributesWidget
