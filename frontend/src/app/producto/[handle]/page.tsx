import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { ProductDetail } from "@/components/product/product-detail"
import { ProductCard } from "@/components/product/product-card"
import type { Product, PricingTier } from "@/lib/types"

type Props = {
  params: Promise<{ handle: string }>
}

const PRODUCT_FIELDS =
  "id,title,handle,description,thumbnail,images.*,options.*,options.values.*,variants.*,variants.thumbnail,variants.prices.*,variants.calculated_price.*,variants.options.*,variants.metadata,variants.images.*,categories.*,collection_id,collection.*,material,weight,height,width,length,metadata,mt_brand.*,mt_vendor.*,mt_product_extension.*"

async function getProduct(handle: string): Promise<Product | null> {
  try {
    const regionId = await getDefaultRegionId()
    const params: Record<string, string> = { handle, fields: PRODUCT_FIELDS }
    if (regionId) params.region_id = regionId
    const data = await storeGet<{ products: Product[] }>("/store/products", params)
    return data.products?.[0] ?? null
  } catch {
    return null
  }
}

async function getSimilarProducts(categoryId: string, excludeId: string): Promise<Product[]> {
  try {
    const regionId = await getDefaultRegionId()
    const params: Record<string, string> = {
      "category_id[]": categoryId,
      limit: "4",
      fields: "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,mt_brand.*,mt_vendor.*",
    }
    if (regionId) params.region_id = regionId
    const data = await storeGet<{ products: Product[] }>("/store/products", params)
    return (data.products ?? []).filter((p) => p.id !== excludeId).slice(0, 4)
  } catch {
    return []
  }
}

async function getComboProducts(collectionId: string, excludeId: string): Promise<Product[]> {
  try {
    const regionId = await getDefaultRegionId()
    const params: Record<string, string> = {
      "collection_id[]": collectionId,
      limit: "6",
      fields:
        "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*",
    }
    if (regionId) params.region_id = regionId
    const data = await storeGet<{ products: Product[] }>("/store/products", params)
    return (data.products ?? []).filter((p) => p.id !== excludeId)
  } catch {
    return []
  }
}

async function getPricingTiers(productId: string): Promise<PricingTier[]> {
  try {
    const data = await storeGet<{ tiers: PricingTier[] }>(
      `/store/products/${productId}/pricing-tiers`,
      {},
      { next: { revalidate: 60 } }
    )
    return data.tiers ?? []
  } catch {
    return []
  }
}

export default async function ProductPage({ params }: Props) {
  const { handle: rawHandle } = await params
  const handle = decodeURIComponent(rawHandle)
  const product = await getProduct(handle)
  if (!product) notFound()

  const [pricingTiers, combo, similar] = await Promise.all([
    getPricingTiers(product.id),
    product.collection_id
      ? getComboProducts(product.collection_id, product.id)
      : Promise.resolve([]),
    product.categories?.[0]?.id
      ? getSimilarProducts(product.categories[0].id, product.id)
      : Promise.resolve([]),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-gray-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-primary">Inicio</Link>
        {product.categories?.[0] && (
          <>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/categoria/${product.categories[0].handle}`} className="hover:text-primary">
              {product.categories[0].name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3" />
        <span className="text-gray-800 truncate max-w-48">{product.title}</span>
      </nav>

      <ProductDetail product={product} pricingTiers={pricingTiers} />

      {/* Descripción */}
      {product.description && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <h2 className="text-lg font-bold text-gray-800 mb-3">Descripción del producto</h2>
          {/<[a-z]/i.test(product.description) ? (
            <div
              className="rich-description text-gray-600 text-sm"
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : (
            <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{product.description}</p>
          )}
        </div>
      )}

      {/* Complementa tu compra (colección) */}
      {combo.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Complementa tu compra</h2>
              {product.collection && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Kit: <span className="font-medium text-primary">{product.collection.title}</span>
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {combo.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Productos similares */}
      {similar.length > 0 && (
        <div className="mt-10">
          <Separator className="mb-6" />
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">Productos Similares</h2>
            {product.categories?.[0] && (
              <Link href={`/categoria/${product.categories[0].handle}`} className="text-sm text-primary hover:underline">
                Ver todos
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
