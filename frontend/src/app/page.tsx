import Link from "next/link"
import Image from "next/image"
import {
  Truck,
  ShieldCheck,
  RotateCcw,
  Headphones,
  Laptop,
  Home,
  Shirt,
  Baby,
  Dumbbell,
  ShoppingBasket,
  PawPrint,
  Wrench,
  ArrowRight,
  Smartphone,
  Book,
  Music,
  Gamepad2,
  Car,
  Flower2,
  Utensils,
  Heart,
  Gem,
  Briefcase,
  Camera,
  Gift,
  Tag,
} from "lucide-react"
import type { LucideProps } from "lucide-react"
import { storeGet, getDefaultRegionId } from "@/lib/medusa"
import { BannerSlider } from "@/components/home/banner-slider"
import { BrandsSlider } from "@/components/home/brands-slider"
import { FeaturedSlider } from "@/components/home/featured-slider"
import type { Banner, Product, Category, Brand } from "@/lib/types"

async function getBanners(): Promise<Banner[]> {
  try {
    const data = await storeGet<{ banners: Banner[] }>(
      "/store/cms/banners",
      { position: "HOME", is_active: "true" }
    )
    return data.banners ?? []
  } catch {
    return []
  }
}

async function getPromoCards(): Promise<Banner[]> {
  try {
    const data = await storeGet<{ banners: Banner[] }>(
      "/store/cms/banners",
      { position: "PROMO", is_active: "true" }
    )
    return data.banners ?? []
  } catch {
    return []
  }
}

const CARD_FIELDS =
  "id,title,handle,thumbnail,images.*,variants.id,variants.prices.*,variants.calculated_price.*,variants.metadata,mt_brand.*,mt_vendor.*"

async function getFeaturedProducts(): Promise<{ products: Product[]; featured: boolean }> {
  try {
    // Intenta primero productos marcados como destacados desde el admin
    const feat = await storeGet<{ products: Product[] }>("/store/products/featured", { limit: "8" })
    if (feat.products?.length) return { products: feat.products, featured: true }

    // Fallback: los más recientes
    const regionId = await getDefaultRegionId()
    const params: Record<string, string> = { limit: "8", fields: CARD_FIELDS }
    if (regionId) params.region_id = regionId
    const latest = await storeGet<{ products: Product[] }>("/store/products", params)
    return { products: latest.products ?? [], featured: false }
  } catch {
    return { products: [], featured: false }
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const data = await storeGet<{ product_categories: Category[] }>(
      "/store/product-categories",
      { parent_category_id: "null", limit: "12" }
    )
    return data.product_categories ?? []
  } catch {
    return []
  }
}

async function getBrands(): Promise<Brand[]> {
  try {
    const data = await storeGet<{ brands: Brand[] }>("/store/brands", { limit: "12" })
    return data.brands ?? []
  } catch {
    return []
  }
}

type IconComponent = React.ComponentType<LucideProps>

const ICON_MAP: Record<string, IconComponent> = {
  laptop: Laptop,
  smartphone: Smartphone,
  home: Home,
  shirt: Shirt,
  baby: Baby,
  dumbbell: Dumbbell,
  "shopping-basket": ShoppingBasket,
  "paw-print": PawPrint,
  wrench: Wrench,
  book: Book,
  music: Music,
  "gamepad-2": Gamepad2,
  car: Car,
  "flower-2": Flower2,
  utensils: Utensils,
  heart: Heart,
  gem: Gem,
  briefcase: Briefcase,
  camera: Camera,
  gift: Gift,
  tag: Tag,
}

const HANDLE_ICON_MAP: Record<string, IconComponent> = {
  tecnologia: Laptop,
  hogar: Home,
  moda: Shirt,
  bebes: Baby,
  deportes: Dumbbell,
  supermercado: ShoppingBasket,
  mascotas: PawPrint,
  ferreteria: Wrench,
}

function getCategoryIcon(cat: Category): React.ReactNode {
  const iconName = cat.metadata?.icon as string | undefined
  const Icon = (iconName && ICON_MAP[iconName]) || HANDLE_ICON_MAP[cat.handle] || ShoppingBasket
  return <Icon className="w-6 h-6" />
}

const FALLBACK_PROMO = [
  { title: "Hasta 30% OFF", subtitle: "En electrónicos seleccionados", color: "bg-green-600", href: "/ofertas" },
  { title: "Ofertas increíbles", subtitle: "Tecnología a precio increíble", color: "bg-purple-600", href: "/catalogo" },
  { title: "Nueva colección", subtitle: "Moda primavera 2026", color: "bg-teal-600", href: "/catalogo" },
  { title: "Todo para el hogar", subtitle: "Decora y renueva tu espacio", color: "bg-blue-600", href: "/catalogo" },
]

export default async function HomePage() {
  const [banners, featured, categories, brands, promoCards] = await Promise.all([
    getBanners(),
    getFeaturedProducts(),
    getCategories(),
    getBrands(),
    getPromoCards(),
  ])
  const { products, featured: isFeatured } = featured

  return (
    <div>
      <BannerSlider banners={banners} />

      {/* Trust badges */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: <Truck className="w-5 h-5 text-primary" />, label: "Envío rápido", sub: "A todo Guatemala" },
            { icon: <ShieldCheck className="w-5 h-5 text-primary" />, label: "Pago seguro", sub: "100% protegido" },
            { icon: <RotateCcw className="w-5 h-5 text-primary" />, label: "Devoluciones fáciles", sub: "30 días de garantía" },
            { icon: <Headphones className="w-5 h-5 text-primary" />, label: "Soporte 24/7", sub: "Siempre disponible" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 py-1">
              <div className="flex-shrink-0">{item.icon}</div>
              <div>
                <p className="text-xs font-semibold text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
        {/* Categorías principales */}
        {categories.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Categorías principales
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-10 gap-3">
              {categories.slice(0, 9).map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categoria/${cat.handle}`}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors text-center group"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    {getCategoryIcon(cat)}
                  </div>
                  <span className="text-xs text-gray-600 leading-tight">{cat.name}</span>
                </Link>
              ))}
              <Link
                href="/catalogo"
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors text-center group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-200 transition-colors">
                  <ArrowRight className="w-6 h-6" />
                </div>
                <span className="text-xs text-gray-500">Ver todas</span>
              </Link>
            </div>
          </section>
        )}

        {/* Productos nuevos / de temporada */}
        {products.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <span className="w-1 h-5 bg-primary rounded-full inline-block" />
                {isFeatured ? "Productos destacados" : "Productos nuevos"}
              </h2>
              <Link href="/catalogo" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <FeaturedSlider products={products} />
          </section>
        )}

        {/* Marcas */}
        {brands.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-primary rounded-full inline-block" />
              Marcas que trabajamos
            </h2>
            <BrandsSlider brands={brands} />
          </section>
        )}

        {/* Ofertas destacadas */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-primary rounded-full inline-block" />
            Ofertas destacadas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {promoCards.length > 0
              ? promoCards.map((card) => (
                  <Link
                    key={card.id}
                    href={card.link_url ?? "/catalogo"}
                    className="relative overflow-hidden rounded-xl text-white hover:opacity-90 transition-opacity min-h-[160px] flex flex-col justify-end"
                  >
                    {/* Imagen de fondo */}
                    <Image
                      src={card.image_url}
                      alt={card.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {/* Overlay degradado */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    {/* Contenido */}
                    <div className="relative z-10 p-5">
                      <p className="text-xs uppercase tracking-wide opacity-80 mb-1">Promoción</p>
                      <h3 className="font-bold text-lg leading-tight">{card.title}</h3>
                      {card.subtitle && <p className="text-sm opacity-80 mt-1">{card.subtitle}</p>}
                      <div className="mt-3">
                        <span className="inline-block bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-md">
                          Ver más
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              : FALLBACK_PROMO.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className={`${card.color} text-white rounded-xl p-5 hover:opacity-90 transition-opacity`}
                  >
                    <p className="text-xs uppercase tracking-wide opacity-80 mb-1">Promoción</p>
                    <h3 className="font-bold text-lg leading-tight">{card.title}</h3>
                    <p className="text-sm opacity-80 mt-1">{card.subtitle}</p>
                    <div className="mt-4">
                      <span className="inline-block bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors">
                        Ver más
                      </span>
                    </div>
                  </Link>
                ))}
          </div>
        </section>
      </div>
    </div>
  )
}
