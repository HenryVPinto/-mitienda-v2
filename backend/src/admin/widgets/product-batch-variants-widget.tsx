import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Checkbox, Container, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type OptionValue = { id: string; value: string }
type ProductOption = { id: string; title: string; values: OptionValue[] }
type VariantOption = { id: string; value: string }
type Variant = { id: string; title: string; options: VariantOption[] }

type Props = { data: { id: string } }

function getPermutations(optionMap: Record<string, string[]>): Record<string, string>[] {
  const keys = Object.keys(optionMap)
  if (keys.length === 0) return [{}]
  const [first, ...rest] = keys
  const restPerms = getPermutations(Object.fromEntries(rest.map((k) => [k, optionMap[k]])))
  return (optionMap[first] ?? []).flatMap((v) =>
    restPerms.map((perm) => ({ [first]: v, ...perm }))
  )
}

const ProductBatchVariantsWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [options, setOptions] = useState<ProductOption[]>([])
  const [existingVariants, setExistingVariants] = useState<Variant[]>([])
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchProduct = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${base}/admin/products/${productId}?fields=id,*options,*options.values,*variants,*variants.options`,
        { credentials: "include" }
      )
      const json = await res.json()
      const opts: ProductOption[] = json.product?.options ?? []
      const vars: Variant[] = json.product?.variants ?? []
      setOptions(opts)
      setExistingVariants(vars)
      const initial: Record<string, string[]> = {}
      opts.forEach((o) => { initial[o.title] = [] })
      setSelected(initial)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProduct() }, [productId])

  const toggle = (optionTitle: string, value: string) => {
    setSelected((prev) => {
      const current = prev[optionTitle] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [optionTitle]: next }
    })
  }

  const existingKeys = new Set(
    existingVariants.map((v) => {
      const variantValueIds = new Set((v.options ?? []).map((op) => op.id))
      return options.map((o) => {
        const match = (o.values ?? []).find((ov) => variantValueIds.has(ov.id))
        return match?.value ?? ""
      }).join(" / ")
    })
  )

  const activeSelected = Object.fromEntries(
    Object.entries(selected).filter(([, vals]) => vals.length > 0)
  )
  const permutations = Object.keys(activeSelected).length > 0
    ? getPermutations(activeSelected)
    : []
  const newCombinations = permutations.filter(
    (perm) => !existingKeys.has(Object.values(perm).join(" / "))
  )
  const allCombinations = permutations

  const handleGenerate = async () => {
    if (allCombinations.length === 0) {
      toast.warning("Selecciona al menos una talla para generar")
      return
    }
    setGenerating(true)
    let created = 0
    let skipped = 0
    let failed = 0
    try {
      for (const optionCombo of allCombinations) {
        const title = Object.values(optionCombo).join(" / ")
        if (existingKeys.has(title)) {
          skipped++
          continue
        }
        const res = await fetch(`${base}/admin/products/${productId}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, options: optionCombo, prices: [] }),
        })
        if (res.ok) {
          created++
        } else {
          failed++
          const errBody = await res.json().catch(() => ({}))
          console.error("Error creando variante:", title, res.status, errBody)
        }
      }
      if (created > 0) toast.success(`${created} variante(s) creada(s)`)
      if (skipped > 0) toast.warning(`${skipped} ya existían y se omitieron`)
      if (failed > 0) toast.error(`${failed} variante(s) fallaron`)
      if (created > 0) await fetchProduct()
      const reset: Record<string, string[]> = {}
      options.forEach((o) => { reset[o.title] = [] })
      setSelected(reset)
    } finally {
      setGenerating(false)
    }
  }

  // No mostrar si el producto no tiene opciones (producto simple)
  if (!loading && options.length === 0) return null

  return (
    <Container className="p-0 overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-ui-bg-subtle transition-colors"
      >
        <Heading level="h2" className="text-ui-fg-base">
          Generar variantes en lote
        </Heading>
        <Text className="text-ui-fg-muted text-sm">
          {open ? "▲ Cerrar" : "▼ Abrir"}
        </Text>
      </button>

      {open && (
        <div className="px-6 pb-6 border-t border-ui-border-base pt-4 space-y-5">
          {loading ? (
            <Text className="text-ui-fg-muted text-sm">Cargando opciones...</Text>
          ) : (
            <>
              <Text className="text-ui-fg-muted text-sm">
                Selecciona los valores por opción. Solo se crean las combinaciones que no existen aún.
              </Text>
              {options.map((option) => (
                <div key={option.id} className="space-y-2">
                  <Text className="font-semibold text-ui-fg-base text-sm">{option.title}</Text>
                  <div className="flex flex-wrap gap-4">
                    {(option.values ?? []).map((val) => (
                      <div key={val.id} className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox
                          checked={selected[option.title]?.includes(val.value) ?? false}
                          onCheckedChange={() => toggle(option.title, val.value)}
                        />
                        <span
                          className="text-sm text-ui-fg-base"
                          onClick={() => toggle(option.title, val.value)}
                        >
                          {val.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {allCombinations.length > 0 && (
                <Text className="text-sm text-ui-fg-muted">
                  {newCombinations.length > 0
                    ? `Se crearán ${newCombinations.length} variante(s) nueva(s)${allCombinations.length > newCombinations.length ? ` (${allCombinations.length - newCombinations.length} ya existen)` : ""}`
                    : "Todas las combinaciones seleccionadas ya existen — selecciona tallas nuevas para agregar"}
                </Text>
              )}
              <Button
                onClick={handleGenerate}
                disabled={generating || allCombinations.length === 0}
                isLoading={generating}
                size="small"
              >
                Generar variantes
              </Button>
            </>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductBatchVariantsWidget
