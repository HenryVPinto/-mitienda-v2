"use client"

import { useState, useCallback } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface OptionValue { id: string; value: string }
interface ProductOption { id: string; title: string; values: OptionValue[] }
interface VariantPrice { id: string; amount: number; currency_code: string; price_list_id: string | null }
interface ProductVariant {
  id: string
  title: string
  sku: string | null
  inventory_quantity: number
  manage_inventory: boolean
  metadata: { color_hex?: string } | null
  prices: VariantPrice[]
  options: OptionValue[]
}
export interface VendorProduct {
  id: string
  title: string
  description: string | null
  status: string
  thumbnail: string | null
  options: ProductOption[]
  variants: ProductVariant[]
  mt_brand?: { id: string; name: string } | null
}
type Product = VendorProduct
// ── Helpers ───────────────────────────────────────────────────────────────────

function getGtqPrice(variant: ProductVariant): number | null {
  const p = variant.prices?.find((p) => p.currency_code === "gtq" && !p.price_list_id)
  return p ? p.amount : null
}

// ── Section: Info básica ──────────────────────────────────────────────────────

function BasicInfoSection({
  product,
  onSaved,
}: {
  product: Product
  onSaved: (updated: Partial<Product>) => void
}) {
  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? "")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      setMsg("Guardado")
      onSaved({ title: title.trim(), description: description.trim() || null })
      setTimeout(() => setMsg(""), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <h2 className="font-semibold text-gray-900 text-base">Información básica</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Descripción</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {product.mt_brand?.name && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
          <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-200">
            {product.mt_brand.name}
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        {msg && (
          <span className={`text-sm ${msg === "Guardado" ? "text-green-600" : "text-red-600"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}

// ── Section: Opciones ─────────────────────────────────────────────────────────

function OptionsSection({
  productId,
  options,
  onOptionsChange,
}: {
  productId: string
  options: ProductOption[]
  onOptionsChange: (opts: ProductOption[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [optTitle, setOptTitle] = useState("")
  const [optValues, setOptValues] = useState("")
  const [adding, setAdding] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState("")

  const addOption = async () => {
    const t = optTitle.trim()
    const vals = optValues
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
    if (!t || vals.length === 0) {
      setError("Nombre y al menos un valor son requeridos")
      return
    }
    setAdding(true)
    setError("")
    try {
      const res = await fetch(`/api/vendor/products/${productId}/options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t, values: vals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      onOptionsChange([...options, data.option])
      setOptTitle("")
      setOptValues("")
      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al agregar opción")
    } finally {
      setAdding(false)
    }
  }

  const deleteOption = async (optionId: string) => {
    if (!confirm("¿Eliminar esta opción y sus valores?")) return
    setDeletingId(optionId)
    try {
      const res = await fetch(`/api/vendor/products/${productId}/options/${optionId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      onOptionsChange(options.filter((o) => o.id !== optionId))
    } catch {
      alert("No se pudo eliminar la opción")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-base">Opciones</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showForm ? "Cancelar" : "+ Agregar opción"}
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Define opciones como Talla o Color. Los valores se separan por coma: S, M, L
      </p>

      {options.length === 0 && !showForm && (
        <p className="text-sm text-gray-400 italic">Sin opciones. Agrega una para habilitar variantes.</p>
      )}

      {options.map((opt) => (
        <div key={opt.id} className="flex items-start justify-between py-3 border-b border-gray-50 last:border-0">
          <div>
            <p className="text-sm font-medium text-gray-800">{opt.title}</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {opt.values?.map((v) => (
                <span key={v.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">
                  {v.value}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => deleteOption(opt.id)}
            disabled={deletingId === opt.id}
            className="text-gray-400 hover:text-red-500 transition text-sm ml-4 shrink-0"
            title="Eliminar opción"
          >
            ×
          </button>
        </div>
      ))}

      {showForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de la opción</label>
            <input
              value={optTitle}
              onChange={(e) => setOptTitle(e.target.value)}
              placeholder="Ej: Talla"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Valores (separados por coma)
            </label>
            <input
              value={optValues}
              onChange={(e) => setOptValues(e.target.value)}
              placeholder="Ej: S, M, L, XL"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            onClick={addOption}
            disabled={adding}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {adding ? "Agregando..." : "Agregar opción"}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Section: Variantes ────────────────────────────────────────────────────────

function VariantsSection({
  productId,
  options,
  variants,
  onVariantsChange,
}: {
  productId: string
  options: ProductOption[]
  variants: ProductVariant[]
  onVariantsChange: (vars: ProductVariant[]) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [price, setPrice] = useState("")
  const [stock, setStock] = useState("0")
  const [manageInventory] = useState(false)
  const [colorHex, setColorHex] = useState("")
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState("")

  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [inlineValues, setInlineValues] = useState<Record<string, { price: string; stock: string }>>({})

  const getInline = (variantId: string, variant: ProductVariant) => {
    if (inlineValues[variantId]) return inlineValues[variantId]
    return {
      price: getGtqPrice(variant)?.toString() ?? "",
      stock: variant.inventory_quantity?.toString() ?? "0",
    }
  }

  const setInline = (variantId: string, field: "price" | "stock", value: string) => {
    setInlineValues((prev) => ({
      ...prev,
      [variantId]: { ...getInline(variantId, variants.find((v) => v.id === variantId)!), [field]: value },
    }))
  }

  const saveVariant = async (variant: ProductVariant) => {
    const inline = getInline(variant.id, variant)
    setSavingId(variant.id)
    try {
      const res = await fetch(`/api/vendor/products/${productId}/variants/${variant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_gtq: inline.price ? Number(inline.price) : undefined,
          inventory_quantity: Number(inline.stock),
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      const updatedVariant: ProductVariant = {
        ...variant,
        inventory_quantity: Number(inline.stock),
        prices: inline.price
          ? [{ id: "tmp", amount: Number(inline.price), currency_code: "gtq", price_list_id: null }]
          : variant.prices,
      }
      onVariantsChange(variants.map((v) => (v.id === variant.id ? updatedVariant : v)))
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar variante")
    } finally {
      setSavingId(null)
    }
  }

  const deleteVariant = async (variantId: string) => {
    if (!confirm("¿Eliminar esta variante?")) return
    setDeletingId(variantId)
    try {
      const res = await fetch(`/api/vendor/products/${productId}/variants/${variantId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Error al eliminar")
      onVariantsChange(variants.filter((v) => v.id !== variantId))
    } catch {
      alert("No se pudo eliminar la variante")
    } finally {
      setDeletingId(null)
    }
  }

  const addVariant = async () => {
    if (options.length > 0) {
      const missing = options.find((o) => !selectedOptions[o.id])
      if (missing) {
        setFormError(`Selecciona un valor para "${missing.title}"`)
        return
      }
    }
    setAdding(true)
    setFormError("")
    const title =
      options.length > 0
        ? options.map((o) => selectedOptions[o.id]).join(" / ")
        : "Default"
    const optionsPayload = options.length > 0
      ? options.map((o) => ({ option_id: o.id, value: selectedOptions[o.id] }))
      : undefined
    try {
      const res = await fetch(`/api/vendor/products/${productId}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          options: optionsPayload,
          price_gtq: price ? Number(price) : undefined,
          inventory_quantity: Number(stock),
          manage_inventory: manageInventory,
          color_hex: colorHex || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      onVariantsChange([...variants, data.variant])
      setSelectedOptions({})
      setPrice("")
      setStock("0")
      setColorHex("")
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear variante")
    } finally {
      setAdding(false)
    }
  }

  const hasColorOption = options.some((o) =>
    o.title.toLowerCase().includes("color")
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-base">Variantes</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showForm ? "Cancelar" : "+ Agregar variante"}
        </button>
      </div>

      {variants.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 italic">
          Sin variantes. {options.length === 0
            ? "Agrega una opción primero, o crea una variante simple."
            : "Agrega variantes para las combinaciones de tallas/colores."}
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => {
            const inline = getInline(variant.id, variant)
            return (
              <div
                key={variant.id}
                className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{variant.title}</p>
                  {variant.metadata?.color_hex && (
                    <span
                      className="inline-block w-4 h-4 rounded-full border border-gray-200 mt-1"
                      style={{ background: variant.metadata.color_hex }}
                    />
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Q</span>
                    <input
                      type="number"
                      min="0"
                      value={inline.price}
                      onChange={(e) => setInline(variant.id, "price", e.target.value)}
                      placeholder="0"
                      className="w-24 pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={inline.stock}
                    onChange={(e) => setInline(variant.id, "stock", e.target.value)}
                    placeholder="Stock"
                    title="Stock"
                    className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => saveVariant(variant)}
                    disabled={savingId === variant.id}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 font-medium px-2"
                  >
                    {savingId === variant.id ? "..." : "✓"}
                  </button>
                  <button
                    onClick={() => deleteVariant(variant.id)}
                    disabled={deletingId === variant.id}
                    className="text-gray-400 hover:text-red-500 transition text-sm px-1"
                    title="Eliminar variante"
                  >
                    ×
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {options.map((opt) => (
            <div key={opt.id}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{opt.title}</label>
              <select
                value={selectedOptions[opt.id] ?? ""}
                onChange={(e) =>
                  setSelectedOptions((prev) => ({ ...prev, [opt.id]: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Selecciona {opt.title.toLowerCase()}</option>
                {opt.values?.map((v) => (
                  <option key={v.id} value={v.value}>{v.value}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio (Q)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasColorOption && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Color hex (opcional, ej: #FF0000)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={colorHex || "#000000"}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {formError && <p className="text-xs text-red-600">{formError}</p>}

          <button
            onClick={addVariant}
            disabled={adding}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {adding ? "Creando..." : "Crear variante"}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductEditor({
  product: initialProduct,
}: {
  product: Product
}) {
  const [product, setProduct] = useState<Product>(initialProduct)

  const updateProduct = useCallback((updates: Partial<Product>) => {
    setProduct((prev) => ({ ...prev, ...updates }))
  }, [])

  const updateOptions = useCallback((opts: ProductOption[]) => {
    setProduct((prev) => ({ ...prev, options: opts }))
  }, [])

  const updateVariants = useCallback((vars: ProductVariant[]) => {
    setProduct((prev) => ({ ...prev, variants: vars }))
  }, [])

  return (
    <div className="space-y-4">
      <BasicInfoSection
        product={product}
        onSaved={updateProduct}
      />
      <OptionsSection
        productId={product.id}
        options={product.options ?? []}
        onOptionsChange={updateOptions}
      />
      <VariantsSection
        productId={product.id}
        options={product.options ?? []}
        variants={product.variants ?? []}
        onVariantsChange={updateVariants}
      />

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Nota:</strong> El producto queda en borrador. El administrador lo revisará y publicará.
      </div>
    </div>
  )
}
