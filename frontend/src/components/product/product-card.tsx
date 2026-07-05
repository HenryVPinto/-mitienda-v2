"use client"

import Link from "next/link"
import Image from "next/image"
import { ShoppingCart } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useCart } from "@/context/cart-context"
import { formatGTQ } from "@/lib/format"
import type { Product } from "@/lib/types"

type Props = {
  product: Product
}

export function ProductCard({ product }: Props) {
  const { addItem, loading } = useCart()
  const variant = product.variants?.[0]
  const regularPrices = (variant?.prices ?? []).filter((p) => !p.price_list_id)
  const price = variant?.calculated_price?.calculated_amount ?? regularPrices[0]?.amount ?? 0
  const priceListOriginal: number | undefined =
    variant?.calculated_price?.original_amount !== variant?.calculated_price?.calculated_amount
      ? variant?.calculated_price?.original_amount
      : undefined
  const compareAt = variant?.metadata?.compare_at_price as number | undefined
  const originalPrice: number | undefined =
    priceListOriginal ?? (compareAt != null && compareAt > price ? compareAt : undefined)
  const imageUrl = product.thumbnail ?? product.images?.[0]?.url ?? null

  async function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault()
    if (!variant) return
    await addItem(variant.id, 1)
  }

  return (
    <Link href={`/producto/${product.handle}`} className="group block">
      <div className="bg-white rounded-lg border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all overflow-hidden">
        {/* Imagen */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {imageUrl ? (
            <div className="absolute inset-0 group-hover:scale-105 transition-transform duration-300 origin-center">
              <Image
                src={imageUrl}
                alt={product.title}
                fill
                className="object-contain p-2"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            </div>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-300 text-xs">
              Sin imagen
            </div>
          )}
          {/* Badge vendedor */}
          {product.mt_vendor && (
            <Badge className="absolute top-2 left-2 bg-primary/90 text-white text-xs px-1.5 py-0.5">
              {product.mt_vendor.name}
            </Badge>
          )}
          {/* Badge marca */}
          {product.mt_brand && !product.mt_vendor && (
            <Badge variant="secondary" className="absolute top-2 left-2 text-xs px-1.5 py-0.5">
              {product.mt_brand.name}
            </Badge>
          )}
          {/* Badge oferta */}
          {originalPrice != null && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              OFERTA
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="h-4 flex items-center">
            {product.mt_brand?.logo_url ? (
              <Image
                src={product.mt_brand.logo_url}
                alt={product.mt_brand.name}
                width={48}
                height={16}
                className="object-contain max-h-4 w-auto"
              />
            ) : (
              <p className="text-xs text-gray-500 truncate">
                {product.mt_brand?.name ?? product.mt_vendor?.name ?? ""}
              </p>
            )}
          </div>
          <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mt-0.5 leading-snug">
            {product.title}
          </h3>

          <div className="flex items-center justify-between mt-2">
            <div>
              <p className="text-base font-bold text-[var(--color-brand-orange)]">
                {formatGTQ(price)}
              </p>
              {originalPrice && originalPrice > price && (
                <p className="text-xs text-gray-400 line-through">{formatGTQ(originalPrice)}</p>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              disabled={loading || !variant}
              className="w-8 h-8 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center disabled:opacity-40 transition-colors"
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  )
}
