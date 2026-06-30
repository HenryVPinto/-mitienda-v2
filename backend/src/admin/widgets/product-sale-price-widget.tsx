import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Price = {
  id: string
  amount: number
  currency_code: string
  price_list_id: string | null
}

type Variant = {
  id: string
  title: string
  prices: Price[]
  metadata: Record<string, unknown> | null
}

type Props = {
  data: { id: string }
}

function fmt(amount: number): string {
  return new Intl.NumberFormat("es-GT", {
    style: "currency",
    currency: "GTQ",
  }).format(amount)
}

const ProductSalePriceWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [variants, setVariants] = useState<Variant[]>([])
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const loadVariants = () => {
    fetch(
      `${base}/admin/products/${productId}?fields=id,variants.id,variants.title,variants.prices.*,variants.metadata`,
      { credentials: "include" }
    )
      .then((r) => r.json())
      .then((d) => {
        const vars: Variant[] = d.product?.variants ?? []
        setVariants(vars)
        const init: Record<string, string> = {}
        vars.forEach((v) => {
          // If offer active, prefill with current offer price
          const hasOffer = v.metadata?.compare_at_price != null
          const regularPrice = v.prices.find((p) => !p.price_list_id)?.amount
          init[v.id] = hasOffer && regularPrice != null ? String(regularPrice) : ""
        })
        setInputValues(init)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadVariants() }, [productId])

  const handleActivate = async (variant: Variant) => {
    const raw = inputValues[variant.id]?.trim()
    if (!raw) { toast.error("Ingresa el precio en oferta"); return }

    const offerPrice = parseFloat(raw)
    if (isNaN(offerPrice) || offerPrice <= 0) {
      toast.error("Ingresa un precio válido mayor a 0")
      return
    }

    const regularPrice = variant.prices.find((p) => !p.price_list_id)
    if (!regularPrice) { toast.error("Esta variante no tiene precio base"); return }

    if (offerPrice >= regularPrice.amount) {
      toast.error(`El precio en oferta debe ser menor al precio actual (${fmt(regularPrice.amount)})`)
      return
    }

    setSaving(variant.id)
    try {
      const res = await fetch(
        `${base}/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: [{ id: regularPrice.id, amount: offerPrice }],
            metadata: {
              ...variant.metadata,
              compare_at_price: regularPrice.amount,
            },
          }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success("Precio de oferta activado")
      loadVariants()
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(null)
    }
  }

  const handleRemove = async (variant: Variant) => {
    const originalPrice = variant.metadata?.compare_at_price as number | undefined
    if (originalPrice == null) return

    const currentPrice = variant.prices.find((p) => !p.price_list_id)
    if (!currentPrice) return

    setSaving(variant.id)
    try {
      const newMeta = { ...variant.metadata }
      delete newMeta.compare_at_price

      const res = await fetch(
        `${base}/admin/products/${productId}/variants/${variant.id}`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prices: [{ id: currentPrice.id, amount: originalPrice }],
            metadata: newMeta,
          }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success("Oferta eliminada — precio restaurado")
      loadVariants()
    } catch {
      toast.error("Error al quitar la oferta")
    } finally {
      setSaving(null)
    }
  }

  if (loading || !variants.length) return null

  return (
    <Container className="divide-y p-0">
      <div className="px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Precio de oferta
        </Heading>
        <p className="text-ui-fg-subtle text-xs mt-0.5">
          Ingresa el precio rebajado. El precio actual se mostrará tachado en el storefront.
        </p>
      </div>

      {variants.map((variant) => {
        const regularPrice = variant.prices.find((p) => !p.price_list_id)
        const compareAt = variant.metadata?.compare_at_price as number | undefined
        const offerActive = compareAt != null

        return (
          <div key={variant.id} className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label size="small" className="text-ui-fg-base font-medium">
                {variant.title}
              </Label>
              {offerActive && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Oferta activa
                </span>
              )}
            </div>

            {offerActive ? (
              <div className="bg-ui-bg-subtle rounded-md px-3 py-2 text-sm space-y-1">
                <div className="flex gap-x-4">
                  <span className="text-ui-fg-subtle">Precio original:</span>
                  <span className="line-through text-ui-fg-muted">{fmt(compareAt!)}</span>
                </div>
                <div className="flex gap-x-4">
                  <span className="text-ui-fg-subtle">Precio oferta:</span>
                  <span className="font-semibold text-ui-fg-base">
                    {regularPrice ? fmt(regularPrice.amount) : "—"}
                  </span>
                </div>
              </div>
            ) : (
              regularPrice && (
                <p className="text-xs text-ui-fg-subtle">
                  Precio actual: <span className="font-medium">{fmt(regularPrice.amount)}</span>
                </p>
              )
            )}

            <div className="flex items-center gap-x-2">
              {!offerActive && (
                <>
                  <span className="text-ui-fg-subtle text-sm flex-shrink-0">Q</span>
                  <Input
                    size="small"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={regularPrice ? `Menos de ${regularPrice.amount}` : "Precio oferta"}
                    value={inputValues[variant.id] ?? ""}
                    onChange={(e) =>
                      setInputValues((prev) => ({ ...prev, [variant.id]: e.target.value }))
                    }
                  />
                  <Button
                    size="small"
                    isLoading={saving === variant.id}
                    onClick={() => handleActivate(variant)}
                  >
                    Activar
                  </Button>
                </>
              )}
              {offerActive && (
                <Button
                  size="small"
                  variant="danger"
                  isLoading={saving === variant.id}
                  onClick={() => handleRemove(variant)}
                >
                  Quitar oferta
                </Button>
              )}
            </div>
          </div>
        )
      })}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductSalePriceWidget
