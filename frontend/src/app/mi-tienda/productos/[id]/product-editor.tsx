"use client"

import { useState, useCallback, useEffect, useMemo, useRef } from "react"

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
  metadata: { color_hex?: string; images_urls?: string[] } | null
  prices: VariantPrice[]
  options: OptionValue[]
}
export interface VendorProduct {
  id: string
  title: string
  description: string | null
  status: string
  thumbnail: string | null
  images: { id: string; url: string }[]
  categories: { id: string; name: string }[]
  metadata: Record<string, unknown> | null
  options: ProductOption[]
  variants: ProductVariant[]
  mt_brand?: { id: string; name: string } | null
  mt_product_extension?: { id?: string; weight?: number | null; description_html?: string | null } | null
}
type Product = VendorProduct

interface Brand { id: string; name: string }
interface Category { id: string; name: string; parent_category_id?: string | null }

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGtqPrice(variant: ProductVariant): number | null {
  const p = variant.prices?.find((p) => p.currency_code === "gtq" && !p.price_list_id)
  return p ? p.amount : null
}

// ── Section: Info básica + Marca + Peso ───────────────────────────────────────

function BasicInfoSection({
  product,
  onSaved,
}: {
  product: Product
  onSaved: (updated: Partial<Product>) => void
}) {
  const [title, setTitle] = useState(product.title)
  const [description, setDescription] = useState(product.description ?? "")
  const [weight, setWeight] = useState(
    product.mt_product_extension?.weight?.toString() ?? ""
  )
  const [brandId, setBrandId] = useState(product.mt_brand?.id ?? "")
  const [categoryId, setCategoryId] = useState(product.categories?.[0]?.id ?? "")
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("/api/vendor/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands ?? []))
      .catch(() => {})
    fetch("/api/vendor/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {})
  }, [])

  const categoryLabel = (cat: Category) => {
    const parent = categories.find((c) => c.id === cat.parent_category_id)
    return parent ? `${parent.name} › ${cat.name}` : cat.name
  }

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
      }
      if (brandId !== (product.mt_brand?.id ?? "")) body.brand_id = brandId || null
      const currentCatId = product.categories?.[0]?.id ?? ""
      if (categoryId !== currentCatId) body.category_id = categoryId || null
      const weightNum = weight.trim() ? Number(weight.trim()) : null
      const currentWeight = product.mt_product_extension?.weight ?? null
      if (weightNum !== currentWeight) body.weight = weightNum

      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).message)

      const selectedBrand = brands.find((b) => b.id === brandId) ?? null
      const selectedCat = categories.find((c) => c.id === categoryId) ?? null
      onSaved({
        title: title.trim(),
        description: description.trim() || null,
        mt_brand: selectedBrand,
        categories: selectedCat ? [selectedCat] : [],
        mt_product_extension: weightNum !== null ? { weight: weightNum } : null,
      })
      setMsg("Guardado")
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Categoría</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Sin categoría</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{categoryLabel(cat)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Marca</label>
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Sin marca</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Peso (lb)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

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

// ── Section: Imágenes ─────────────────────────────────────────────────────────

async function uploadToR2(file: File): Promise<string> {
  const formData = new FormData()
  formData.append("files", file)
  const res = await fetch("/api/vendor/uploads", { method: "POST", body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? "Error al subir imagen")
  const url: string = data.files?.[0]?.url
  if (!url) throw new Error("No se obtuvo URL del archivo")
  return url
}

async function patchProduct(productId: string, body: Record<string, unknown>) {
  const res = await fetch(`/api/vendor/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error("Error al guardar cambios")
}

async function patchVariantImages(productId: string, variantId: string, images_urls: string[]) {
  const res = await fetch(`/api/vendor/products/${productId}/variants/${variantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ images_urls }),
  })
  if (!res.ok) throw new Error("Error al guardar fotos de variante")
}

function ColorImagesRow({
  productId,
  variant,
}: {
  productId: string
  variant: ProductVariant
}) {
  const [urls, setUrls] = useState<string[]>(variant.metadata?.images_urls ?? [])
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState("")

  const add = async (file: File) => {
    setUploading(true)
    setErr("")
    try {
      const url = await uploadToR2(file)
      const next = [...urls, url]
      await patchVariantImages(productId, variant.id, next)
      setUrls(next)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error")
    } finally {
      setUploading(false)
    }
  }

  const remove = async (url: string) => {
    const next = urls.filter((u) => u !== url)
    try {
      await patchVariantImages(productId, variant.id, next)
      setUrls(next)
    } catch {
      setErr("Error al eliminar foto")
    }
  }

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <span
        className="w-5 h-5 rounded-full border border-gray-200 shrink-0 mt-0.5"
        style={{ background: variant.metadata?.color_hex ?? "#ccc" }}
        title={variant.metadata?.color_hex}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-600 mb-2">{variant.title}</p>
        <div className="flex flex-wrap gap-2">
          {urls.map((url) => (
            <div key={url} className="relative group w-14 h-14">
              <img src={url} alt="" className="w-full h-full object-cover rounded-lg border border-gray-200" />
              <button
                onClick={() => remove(url)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs hidden group-hover:flex items-center justify-center leading-none"
              >
                ×
              </button>
            </div>
          ))}
          <label className={`w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center cursor-pointer transition ${
            uploading ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-400"
          }`}>
            <span className="text-xl">{uploading ? "…" : "+"}</span>
            <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) add(f); e.target.value = "" }} />
          </label>
        </div>
        {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
      </div>
    </div>
  )
}

function ImagesSection({
  product,
  onSaved,
}: {
  product: Product
  onSaved: (updates: Partial<Product>) => void
}) {
  const [images, setImages] = useState<{ id: string; url: string }[]>(product.images ?? [])
  const [thumbnail, setThumbnail] = useState(product.thumbnail)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState("")

  const colorVariants = useMemo(() => {
    const seen = new Set<string>()
    return (product.variants ?? []).filter((v) => {
      const hex = v.metadata?.color_hex
      if (!hex || seen.has(hex)) return false
      seen.add(hex)
      return true
    })
  }, [product.variants])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(""), 3000) }

  const addImage = async (file: File) => {
    setUploading(true)
    setMsg("")
    try {
      const url = await uploadToR2(file)
      const isFirst = images.length === 0
      const newImages = [...images.map((i) => ({ url: i.url })), { url }]
      const patch: Record<string, unknown> = { images: newImages }
      if (isFirst) patch.thumbnail = url
      await patchProduct(product.id, patch)
      setImages((prev) => [...prev, { id: url, url }])
      if (isFirst) { setThumbnail(url); onSaved({ thumbnail: url }) }
      showMsg("Foto agregada")
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error al subir")
    } finally {
      setUploading(false)
    }
  }

  const removeImage = async (url: string) => {
    const remaining = images.filter((i) => i.url !== url)
    const newThumb = thumbnail === url ? (remaining[0]?.url ?? null) : thumbnail
    try {
      await patchProduct(product.id, {
        images: remaining.map((i) => ({ url: i.url })),
        ...(newThumb !== thumbnail ? { thumbnail: newThumb } : {}),
      })
      setImages(remaining)
      if (newThumb !== thumbnail) { setThumbnail(newThumb); onSaved({ thumbnail: newThumb }) }
      showMsg("Foto eliminada")
    } catch {
      setMsg("Error al eliminar foto")
    }
  }

  const setAsThumbnail = async (url: string) => {
    try {
      await patchProduct(product.id, { thumbnail: url })
      setThumbnail(url)
      onSaved({ thumbnail: url })
      showMsg("Foto principal actualizada")
    } catch {
      setMsg("Error al cambiar foto principal")
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
      <h2 className="font-semibold text-gray-900 text-base">Imágenes</h2>

      {/* Gallery */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
          Galería del producto
        </p>
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.url} className="relative group w-20 h-20">
              <img
                src={img.url}
                alt=""
                className={`w-full h-full object-cover rounded-xl border-2 transition ${
                  thumbnail === img.url ? "border-blue-500" : "border-gray-200"
                }`}
              />
              {thumbnail === img.url && (
                <span className="absolute bottom-1 left-1 bg-blue-500 text-white text-[9px] font-bold px-1 rounded">
                  PRINCIPAL
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex flex-col items-center justify-center gap-1">
                {thumbnail !== img.url && (
                  <button
                    onClick={() => setAsThumbnail(img.url)}
                    className="text-white text-[10px] font-medium bg-blue-500 px-1.5 py-0.5 rounded"
                  >
                    Principal
                  </button>
                )}
                <button
                  onClick={() => removeImage(img.url)}
                  className="text-white text-[10px] font-medium bg-red-500 px-1.5 py-0.5 rounded"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}

          {/* Upload button */}
          <label className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition gap-1 ${
            uploading ? "border-gray-200 text-gray-300" : "border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500"
          }`}>
            <span className="text-2xl leading-none">{uploading ? "…" : "+"}</span>
            <span className="text-[10px]">{uploading ? "Subiendo" : "Foto"}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) addImage(f); e.target.value = "" }}
            />
          </label>
        </div>

        {images.length > 0 && (
          <p className="text-xs text-gray-400 mt-2">
            Pasa el cursor sobre una foto para establecerla como principal o eliminarla.
          </p>
        )}
        {msg && (
          <p className={`mt-2 text-sm ${msg.startsWith("Error") ? "text-red-600" : "text-green-600"}`}>
            {msg}
          </p>
        )}
      </div>

      {/* Per-color images */}
      {colorVariants.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Fotos por color
          </p>
          <div>
            {colorVariants.map((v) => (
              <ColorImagesRow key={v.id} productId={product.id} variant={v} />
            ))}
          </div>
        </div>
      )}
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
    const vals = optValues.split(",").map((v) => v.trim()).filter(Boolean)
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
      const res = await fetch(`/api/vendor/products/${productId}/options/${optionId}`, { method: "DELETE" })
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
        <button onClick={() => setShowForm(!showForm)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
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
                <span key={v.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md">{v.value}</span>
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Valores (separados por coma)</label>
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
  const [colorHex, setColorHex] = useState("#000000")
  const [useColor, setUseColor] = useState(false)
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
      const res = await fetch(`/api/vendor/products/${productId}/variants/${variantId}`, { method: "DELETE" })
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
          manage_inventory: false,
          color_hex: useColor ? colorHex : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message)
      onVariantsChange([...variants, data.variant])
      setSelectedOptions({})
      setPrice("")
      setStock("0")
      setColorHex("#000000")
      setUseColor(false)
      setShowForm(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al crear variante")
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 text-base">Variantes</h2>
        <button onClick={() => setShowForm(!showForm)} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          {showForm ? "Cancelar" : "+ Agregar variante"}
        </button>
      </div>

      {variants.length === 0 && !showForm ? (
        <p className="text-sm text-gray-400 italic">
          {options.length === 0
            ? "Agrega una opción primero, o crea una variante simple."
            : "Agrega variantes para las combinaciones de opciones."}
        </p>
      ) : (
        <div className="space-y-2">
          {variants.map((variant) => {
            const inline = getInline(variant.id, variant)
            return (
              <div key={variant.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
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
                onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [opt.id]: e.target.value }))}
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

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useColor}
                onChange={(e) => setUseColor(e.target.checked)}
                className="rounded"
              />
              Asignar color a esta variante
            </label>
            {useColor && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                />
                <input
                  type="text"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  placeholder="#000000"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

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

// ── Section: Descripción enriquecida ─────────────────────────────────────────

function RichTextEditor({
  value,
  onChange,
}: {
  value: string
  onChange: (html: string) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)

  const exec = (cmd: string) => {
    document.execCommand(cmd, false, undefined)
    editorRef.current?.focus()
    onChange(editorRef.current?.innerHTML ?? "")
  }

  const handleInput = () => {
    onChange(editorRef.current?.innerHTML ?? "")
  }

  const tools = [
    { label: "B", title: "Negrita", cmd: "bold", style: "font-bold" },
    { label: "I", title: "Cursiva", cmd: "italic", style: "italic" },
    { label: "U", title: "Subrayado", cmd: "underline", style: "underline" },
    { label: "•", title: "Lista con viñetas", cmd: "insertUnorderedList", style: "" },
    { label: "1.", title: "Lista numerada", cmd: "insertOrderedList", style: "" },
  ]

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {tools.map((t) => (
          <button
            key={t.cmd}
            type="button"
            title={t.title}
            onMouseDown={(e) => { e.preventDefault(); exec(t.cmd) }}
            className={`px-2.5 py-1 text-sm rounded hover:bg-gray-200 text-gray-700 transition ${t.style}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {/* Editable area */}
      <div
        ref={editorRef as React.RefObject<HTMLDivElement>}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: value }}
        className="min-h-[160px] px-3 py-2.5 text-sm text-gray-800 focus:outline-none prose prose-sm max-w-none"
        style={{ lineHeight: "1.6" }}
      />
    </div>
  )
}

function DescriptionHtmlSection({
  product,
  onSaved,
}: {
  product: Product
  onSaved: (updates: Partial<Product>) => void
}) {
  const [html, setHtml] = useState(product.mt_product_extension?.description_html ?? "")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description_html: html }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      onSaved({ mt_product_extension: { ...product.mt_product_extension, description_html: html } })
      setMsg("Guardado")
      setTimeout(() => setMsg(""), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 text-base">Descripción detallada</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Descripción completa que se muestra en la página del producto. Puedes usar formato enriquecido.
        </p>
      </div>

      <RichTextEditor value={html} onChange={setHtml} />

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Guardando..." : "Guardar descripción"}
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

// ── Section: Reglas de precio ─────────────────────────────────────────────────

interface PromoRule {
  id: string
  name: string
  type: "WHOLESALE" | "QUANTITY_DISCOUNT"
  description: string | null
  min_quantity: number | null
  discount_percentage: number | null
  discount_amount: number | null
}

function PricingRulesSection({
  product,
  onSaved,
}: {
  product: Product
  onSaved: (updates: Partial<Product>) => void
}) {
  const currentIds: string[] = Array.isArray(product.metadata?.promo_rule_ids)
    ? (product.metadata!.promo_rule_ids as string[])
    : []

  const [selected, setSelected] = useState<Set<string>>(new Set(currentIds))
  const [rules, setRules] = useState<PromoRule[]>([])
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    fetch("/api/vendor/promotion-rules")
      .then((r) => r.json())
      .then((d) => setRules(d.rules ?? []))
      .catch(() => {})
  }, [])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    setMsg("")
    try {
      const res = await fetch(`/api/vendor/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_rule_ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error((await res.json()).message)
      onSaved({ metadata: { ...product.metadata, promo_rule_ids: Array.from(selected) } })
      setMsg("Guardado")
      setTimeout(() => setMsg(""), 2000)
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const typeLabel = (type: PromoRule["type"]) =>
    type === "WHOLESALE" ? "Mayoreo" : "Desc. por cantidad"

  const typeBg = (type: PromoRule["type"]) =>
    type === "WHOLESALE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"

  const ruleDescription = (r: PromoRule) => {
    const parts: string[] = []
    if (r.min_quantity) parts.push(`Mín. ${r.min_quantity} unidades`)
    if (r.discount_percentage) parts.push(`${r.discount_percentage}% de descuento`)
    if (r.discount_amount) parts.push(`Q${r.discount_amount} de descuento`)
    return parts.join(" · ") || r.description || ""
  }

  if (rules.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-gray-900 text-base">Reglas de precio</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Selecciona las reglas de mayoreo o descuento por cantidad que aplican a este producto.
          El administrador configura estas reglas.
        </p>
      </div>

      <div className="space-y-2">
        {rules.map((rule) => (
          <label
            key={rule.id}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              selected.has(rule.id)
                ? "border-blue-300 bg-blue-50"
                : "border-gray-100 hover:border-gray-200 bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(rule.id)}
              onChange={() => toggle(rule.id)}
              className="mt-0.5 rounded"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-800">{rule.name}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${typeBg(rule.type)}`}>
                  {typeLabel(rule.type)}
                </span>
              </div>
              {ruleDescription(rule) && (
                <p className="text-xs text-gray-500 mt-0.5">{ruleDescription(rule)}</p>
              )}
            </div>
          </label>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {saving ? "Guardando..." : "Guardar reglas"}
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

// ── Main component ────────────────────────────────────────────────────────────

export default function ProductEditor({ product: initialProduct }: { product: Product }) {
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
      <BasicInfoSection product={product} onSaved={updateProduct} />
      <ImagesSection product={product} onSaved={updateProduct} />
      <DescriptionHtmlSection product={product} onSaved={updateProduct} />
      <PricingRulesSection product={product} onSaved={updateProduct} />
      <OptionsSection productId={product.id} options={product.options ?? []} onOptionsChange={updateOptions} />
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
