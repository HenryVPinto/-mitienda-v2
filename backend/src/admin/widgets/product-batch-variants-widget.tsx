import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Checkbox, Container, Heading, Text, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type OptionValue = { id: string; value: string }
type ProductOption = { id: string; title: string; values: OptionValue[] }
type VariantOption = { option_id: string; value: string }
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

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      try {
        const res = await fetch(
          `${base}/admin/products/${productId}?fields=id,options.id,options.title,options.values.id,options.values.value,variants.id,variants.title,variants.options.option_id,variants.options.value`,
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
    fetchProduct()
  }, [productId])

  const toggle = (optionTitle: string, value: string) => {
    setSelected((prev) => {
      const current = prev[optionTitle] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [optionTitle]: next }
    })
  }

  const handleGenerate = async () => {
    const filtered = Object.fromEntries(
      Object.entries(selected).filter(([, vals]) => vals.length > 0)
    )
    if (Object.keys(filtered).length === 0) {
      toast.error("Selecciona al menos un valor por opción")
      return
    }

    const permutations = getPermutations(filtered)

    const existingKeys = new Set(
      existingVariants.map((v) =>
        options.map((o) => {
          const vo = v.options?.find((op) => op.option_id === o.id)
          return vo?.value ?? ""
        }).join(" / ")
      )
    )

    const toCreate = permutations.filter((perm) => {
      const key = Object.values(perm).join(" / ")
      return !existingKeys.has(key)
    })

    if (toCreate.length === 0) {
      toast.warning("Todas las combinaciones seleccionadas ya existen")
      return
    }

    setGenerating(true)
    let created = 0
    let failed = 0
    try {
      for (const optionCombo of toCreate) {
        const title = Object.values(optionCombo).join(" / ")
        const res = await fetch(`${base}/admin/products/${productId}/variants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title, options: optionCombo }),
        })
        if (res.ok) {
          created++
        } else {
          failed++
        }
      }
      if (created > 0) toast.success(`${created} variante(s) creada(s)`)
      if (failed > 0) toast.error(`${failed} variante(s) fallaron`)
      if (created > 0) {
        // Refresh existing variants
        const res = await fetch(
          `${base}/admin/products/${productId}?fields=variants.id,variants.title,variants.options.option_id,variants.options.value`,
          { credentials: "include" }
        )
        const json = await res.json()
        setExistingVariants(json.product?.variants ?? [])
        const reset: Record<string, string[]> = {}
        options.forEach((o) => { reset[o.title] = [] })
        setSelected(reset)
      }
    } finally {
      setGenerating(false)
    }
  }

  if (loading || options.length === 0) return null

  const totalCombinations = getPermutations(
    Object.fromEntries(Object.entries(selected).filter(([, v]) => v.length > 0))
  ).length

  const existingKeys = new Set(
    existingVariants.map((v) =>
      options.map((o) => {
        const vo = v.options?.find((op) => op.option_id === o.id)
        return vo?.value ?? ""
      }).join(" / ")
    )
  )

  const newCombinations = totalCombinations > 0
    ? getPermutations(Object.fromEntries(Object.entries(selected).filter(([, v]) => v.length > 0)))
        .filter((perm) => !existingKeys.has(Object.values(perm).join(" / "))).length
    : 0

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
          <Text className="text-ui-fg-muted text-sm">
            Selecciona los valores por opción. Se crearán todas las combinaciones nuevas.
          </Text>

          {options.map((option) => (
            <div key={option.id} className="space-y-2">
              <Text className="font-semibold text-ui-fg-base">{option.title}</Text>
              <div className="flex flex-wrap gap-3">
                {option.values.map((val) => (
                  <label
                    key={val.id}
                    className="flex items-center gap-2 cursor-pointer select-none"
                  >
                    <Checkbox
                      checked={selected[option.title]?.includes(val.value) ?? false}
                      onCheckedChange={() => toggle(option.title, val.value)}
                    />
                    <span className="text-sm text-ui-fg-base">{val.value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {totalCombinations > 0 && (
            <Text className="text-sm text-ui-fg-muted">
              {newCombinations > 0
                ? `Se crearán ${newCombinations} variante(s) nueva(s) de ${totalCombinations} combinaciones`
                : "Todas las combinaciones seleccionadas ya existen"}
            </Text>
          )}

          <Button
            onClick={handleGenerate}
            disabled={generating || newCombinations === 0}
            isLoading={generating}
            size="small"
          >
            Generar variantes
          </Button>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.before",
})

export default ProductBatchVariantsWidget
