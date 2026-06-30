"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import Link from "next/link"
import { Truck, RotateCcw, ShieldCheck, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ProductGallery } from "@/components/product/product-gallery"
import { AddToCartButton } from "@/components/product/add-to-cart-button"
import { formatGTQ } from "@/lib/format"
import type { Product, PricingTier } from "@/lib/types"

type Props = {
  product: Product
  pricingTiers: PricingTier[]
}

function isColorOption(title: string) {
  return title.toLowerCase().includes("color")
}

const METADATA_SKIP = new Set(["color_hex"])

function buildAttributes(product: Product): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = []

  if (product.material) rows.push({ label: "Material", value: product.material })

  const weight = product.weight ?? product.mt_product_extension?.weight
  if (weight) {
    rows.push({
      label: "Peso",
      value: weight >= 1000 ? `${(weight / 1000).toFixed(2).replace(/\.00$/, "")} kg` : `${weight} g`,
    })
  }

  if (product.height || product.width || product.length) {
    const parts = [
      product.height ? `${product.height} cm alto` : null,
      product.width ? `${product.width} cm ancho` : null,
      product.length ? `${product.length} cm largo` : null,
    ].filter(Boolean)
    rows.push({ label: "Dimensiones", value: parts.join(" × ") })
  }

  const meta = product.metadata
  if (meta && typeof meta === "object") {
    Object.entries(meta).forEach(([k, v]) => {
      if (!METADATA_SKIP.has(k) && v != null && v !== "") {
        rows.push({ label: k.replace(/_/g, " "), value: String(v) })
      }
    })
  }

  const extMeta = product.mt_product_extension?.metadata
  if (extMeta && typeof extMeta === "object") {
    Object.entries(extMeta).forEach(([k, v]) => {
      if (v != null && v !== "") {
        rows.push({ label: k.replace(/_/g, " "), value: String(v) })
      }
    })
  }

  return rows
}

export function ProductDetail({ product, pricingTiers }: Props) {
  // Inicializar con los valores de la primera variante
  const initialValues = useMemo(() => {
    const map: Record<string, string> = {}
    product.variants?.[0]?.options?.forEach((o) => {
      map[o.option_id] = o.value
    })
    return map
  }, [product])

  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(initialValues)

  // Variante activa según selección
  const currentVariant = useMemo(() => {
    return (
      product.variants?.find((v) =>
        v.options?.every((o) => selectedValues[o.option_id] === o.value)
      ) ?? product.variants?.[0]
    )
  }, [product.variants, selectedValues])

  // Precio de la variante activa
  const regularPrices = (currentVariant?.prices ?? []).filter((p) => !p.price_list_id)
  const price =
    currentVariant?.calculated_price?.calculated_amount ??
    regularPrices[0]?.amount ??
    currentVariant?.prices?.[0]?.amount ??
    0

  // Precio tachado: primero price list activo, luego compare_at_price de metadata
  const priceListOriginal =
    currentVariant?.calculated_price?.original_amount !== currentVariant?.calculated_price?.calculated_amount
      ? currentVariant?.calculated_price?.original_amount
      : undefined
  const compareAtPrice = currentVariant?.metadata?.compare_at_price as number | undefined
  const originalPrice =
    priceListOriginal ??
    (compareAtPrice != null && compareAtPrice > price ? compareAtPrice : undefined)

  const baseImages = product.images?.length
    ? product.images
    : product.thumbnail
    ? [{ id: "thumb", url: product.thumbnail }]
    : []

  const variantImageUrl = currentVariant?.images?.[0]?.url ?? null

  const galleryImages = variantImageUrl
    ? [{ id: `v-${currentVariant?.id}`, url: variantImageUrl }, ...baseImages.filter((img) => img.url !== variantImageUrl)]
    : baseImages

  function select(optionId: string, value: string) {
    setSelectedValues((prev) => ({ ...prev, [optionId]: value }))
  }

  // Verificar si una combinación de valores tiene variante disponible
  function isValueAvailable(optionId: string, value: string) {
    const tentative = { ...selectedValues, [optionId]: value }
    return product.variants?.some((v) =>
      v.options?.every((o) => tentative[o.option_id] === o.value)
    ) ?? false
  }

  const variantExists = product.variants?.some((v) =>
    v.options?.every((o) => selectedValues[o.option_id] === o.value)
  ) ?? true

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <ProductGallery
          key={variantImageUrl ? currentVariant?.id : "static"}
          images={galleryImages}
          title={product.title}
        />
      </div>

      {/* Info */}
      <div className="space-y-4">
        {/* Marca + badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {product.mt_brand && (
            product.mt_brand.logo_url ? (
              <div className="flex items-center h-9 px-2 border border-gray-100 rounded-lg bg-white shadow-sm">
                <Image
                  src={product.mt_brand.logo_url}
                  alt={product.mt_brand.name}
                  width={80}
                  height={28}
                  className="object-contain max-h-7 w-auto"
                />
              </div>
            ) : (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                {product.mt_brand.name}
              </Badge>
            )
          )}
          <Badge variant="secondary" className="text-green-700 bg-green-50">NUEVO</Badge>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 leading-tight">{product.title}</h1>

        {/* Precio */}
        <div className="space-y-1">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-[var(--color-brand-orange)]">
              {formatGTQ(price)}
            </span>
            {originalPrice && originalPrice > price && (
              <span className="text-lg text-gray-400 line-through">{formatGTQ(originalPrice)}</span>
            )}
          </div>
          <p className="text-xs text-green-600 font-medium">En Stock — Envío 2-3 días</p>
        </div>

        {/* Tabla de precios por volumen */}
        {pricingTiers.length > 0 && (
          <div className="border border-dashed border-primary/30 rounded-lg p-3">
            <p className="text-xs font-semibold text-primary mb-3 uppercase tracking-wide flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> Precios por volumen
            </p>
            <div className="grid gap-2">
              <div className="grid grid-cols-4 text-xs text-gray-400 font-medium px-1">
                <span>Cantidad</span>
                <span className="text-center">c/u</span>
                <span className="text-center">Descuento</span>
                <span className="text-right">Total</span>
              </div>
              <div className="grid grid-cols-4 items-center text-sm bg-gray-50 rounded-md px-3 py-2">
                <span className="text-gray-600">1 unidad</span>
                <span className="text-center font-medium">{formatGTQ(price)}</span>
                <span className="text-center text-gray-400">—</span>
                <span className="text-right font-medium">{formatGTQ(price)}</span>
              </div>
              {pricingTiers.map((tier) => {
                const unitAfterDiscount = Math.round(price * (1 - tier.discount_percentage / 100))
                return (
                  <div key={tier.rule_id} className="grid grid-cols-4 items-center text-sm bg-primary/5 border border-primary/20 rounded-md px-3 py-2">
                    <span className="text-primary font-semibold">{tier.min_quantity}+ unidades</span>
                    <span className="text-center font-bold text-[var(--color-brand-orange)]">{formatGTQ(unitAfterDiscount)}</span>
                    <span className="text-center text-green-600 font-semibold">−{tier.discount_percentage}%</span>
                    <span className="text-right font-bold">{formatGTQ(unitAfterDiscount * tier.min_quantity)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Selectores de variante */}
        {product.options?.map((option) => {
          const isColor = isColorOption(option.title)
          return (
            <div key={option.id}>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {option.title}
                {selectedValues[option.id] && (
                  <span className="ml-2 font-normal text-gray-500">{selectedValues[option.id]}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {option.values.map((val) => {
                  const isSelected = selectedValues[option.id] === val.value
                  const available = isValueAvailable(option.id, val.value)

                  // Para opciones de color: intentar mostrar color como swatch si hay hex en metadata
                  const matchingVariant = product.variants?.find((v) =>
                    v.options?.some((o) => o.option_id === option.id && o.value === val.value)
                  )
                  const colorHex = isColor
                    ? (matchingVariant?.metadata as { color_hex?: string } | null)?.color_hex
                    : null

                  return (
                    <button
                      key={val.id}
                      onClick={() => select(option.id, val.value)}
                      disabled={!available}
                      title={val.value}
                      className={`
                        relative transition-all
                        ${colorHex
                          ? "w-8 h-8 rounded-full border-2"
                          : "px-3 py-1.5 rounded-md text-sm border"
                        }
                        ${isSelected
                          ? colorHex
                            ? "border-primary ring-2 ring-primary/30 scale-110"
                            : "border-primary text-primary bg-primary/5 font-semibold"
                          : colorHex
                            ? "border-gray-300 hover:border-gray-500"
                            : "border-gray-200 text-gray-700 hover:border-primary hover:text-primary"
                        }
                        ${!available ? "opacity-40 cursor-not-allowed line-through" : "cursor-pointer"}
                      `}
                      style={colorHex ? { backgroundColor: colorHex } : undefined}
                    >
                      {!colorHex && val.value}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Agregar al carrito */}
        {currentVariant && (
          <AddToCartButton
            variantId={currentVariant.id}
            basePrice={price}
            tiers={pricingTiers}
            disabled={!variantExists}
          />
        )}
        {!variantExists && (
          <p className="text-sm text-red-500">Esta combinación no está disponible.</p>
        )}

        {/* Especificaciones */}
        {(() => {
          const attrs = buildAttributes(product)
          if (!attrs.length) return null
          return (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-3 py-2 bg-gray-50 border-b border-gray-100">
                Especificaciones
              </p>
              <dl className="divide-y divide-gray-100">
                {attrs.map(({ label, value }) => (
                  <div key={label} className="flex items-baseline px-3 py-2 text-sm">
                    <dt className="w-32 flex-shrink-0 text-gray-500 capitalize">{label}</dt>
                    <dd className="text-gray-800 font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )
        })()}

        {/* Garantías */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: <Truck className="w-4 h-4 text-primary" />, text: "Envío gratis Guatemala" },
            { icon: <RotateCcw className="w-4 h-4 text-primary" />, text: "Devolución 30 días" },
            { icon: <ShieldCheck className="w-4 h-4 text-primary" />, text: "Garantía oficial" },
          ].map((g) => (
            <div key={g.text} className="flex flex-col items-center text-center gap-1 p-2 border border-gray-100 rounded-lg">
              {g.icon}
              <span className="text-xs text-gray-500 leading-tight">{g.text}</span>
            </div>
          ))}
        </div>

        {/* Vendedor */}
        {product.mt_vendor && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {product.mt_vendor.logo_url ? (
              <Image
                src={product.mt_vendor.logo_url}
                alt={product.mt_vendor.name}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                {product.mt_vendor.name[0]}
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500">Vendido por</p>
              <Link
                href={`/vendedor/${product.mt_vendor.handle}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {product.mt_vendor.name}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
