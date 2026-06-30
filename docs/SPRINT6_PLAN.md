# Sprint 6 — Frontend Next.js

> **ANTES DE EJECUTAR:** El usuario tiene un diseño UI ya definido que debe ser revisado y aprobado antes de escribir cualquier código frontend. Al iniciar la ejecución de este sprint, solicitar el diseño (capturas, Figma o archivo .pen de Pencil) y actualizar este plan con las especificaciones visuales concretas (colores, tipografía, layout) antes de continuar.

## Objetivo
Construir el storefront público de MiTienda sobre Next.js 15 con App Router, consumiendo el backend Medusa v2 y todas las APIs custom de los sprints anteriores.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v3 |
| Componentes | shadcn/ui |
| Estado del carrito | React Context + localStorage |
| Fetch | Nativo (no SDK de Medusa) |

---

## Variables de entorno

```env
NEXT_PUBLIC_MEDUSA_URL=http://localhost:9000
NEXT_PUBLIC_PUBLISHABLE_KEY=pk_42a9a241e2da54a178f8063bde40608bd98e519cd7817e4f673a87208e498414
```

---

## Estructura de carpetas

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Layout raíz (header + footer)
│   │   ├── page.tsx                 # Home
│   │   ├── categoria/
│   │   │   └── [handle]/
│   │   │       └── page.tsx         # Listado de productos por categoría
│   │   ├── producto/
│   │   │   └── [handle]/
│   │   │       └── page.tsx         # Detalle de producto
│   │   ├── carrito/
│   │   │   └── page.tsx             # Carrito de compra
│   │   ├── checkout/
│   │   │   └── page.tsx             # Flujo de checkout
│   │   ├── pedido/
│   │   │   └── [id]/
│   │   │       └── page.tsx         # Confirmación de orden
│   │   ├── vendedor/
│   │   │   └── [handle]/
│   │   │       └── page.tsx         # Perfil público del vendedor
│   │   ├── faq/
│   │   │   └── page.tsx             # Preguntas frecuentes (CMS)
│   │   └── [slug]/
│   │       └── page.tsx             # Páginas estáticas CMS (términos, privacidad)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── header.tsx           # Header: logo, búsqueda, carrito
│   │   │   ├── footer.tsx           # Footer: links CMS, categorías
│   │   │   └── nav-categories.tsx   # Navegación por categorías
│   │   ├── home/
│   │   │   ├── banner-slider.tsx    # Carrusel de banners
│   │   │   └── product-grid.tsx     # Grid de productos destacados
│   │   ├── product/
│   │   │   ├── product-card.tsx     # Tarjeta en listados
│   │   │   ├── product-gallery.tsx  # Galería de imágenes
│   │   │   ├── variant-selector.tsx # Selector de variantes
│   │   │   └── promotions-badge.tsx # Badge de promoción activa
│   │   ├── cart/
│   │   │   ├── cart-drawer.tsx      # Drawer lateral del carrito
│   │   │   ├── cart-item.tsx        # Ítem en el carrito
│   │   │   └── promo-summary.tsx    # Resumen de ahorros
│   │   └── checkout/
│   │       ├── address-form.tsx     # Formulario de dirección
│   │       └── order-summary.tsx    # Resumen del pedido
│   │
│   ├── context/
│   │   └── cart-context.tsx         # Estado global del carrito
│   │
│   └── lib/
│       ├── medusa.ts                # Cliente fetch con headers comunes
│       ├── cart.ts                  # Helpers carrito (crear, agregar, etc.)
│       └── format.ts                # Formateo de precios (GTQ)
```

---

## Páginas y componentes — detalle

### 1. Layout raíz
**Header:**
- Logo MiTienda
- Barra de búsqueda (filtra productos al escribir)
- Ícono de carrito con badge contador
- Link de cuenta / login

**Footer:**
- Links a páginas CMS (`/store/cms/pages`) — términos, privacidad
- Categorías principales
- Redes sociales

---

### 2. Home `/`
- **Banners:** carrusel con los banners activos de `GET /store/cms/banners?position=HOME`
- **Categorías destacadas:** grid de iconos con las categorías raíz
- **Productos destacados:** grid de 8 productos de `GET /store/products?limit=8`

---

### 3. Categoría `/categoria/[handle]`
- Título de la categoría
- Grid de productos con `GET /store/products?category_handle[]=handle&limit=12`
- Paginación simple (anterior / siguiente)
- Filtro de precio (min / max)
- Ordenar por: relevancia, precio ascendente, precio descendente

---

### 4. Producto `/producto/[handle]`
- Galería de imágenes (thumbnail + ampliada)
- Título, precio, marca (badge)
- Selector de variante (color, talla según opciones del producto)
- Precio al por mayor si tiene extensión (`mt_product_extension.wholesale_price`)
- **Badge de promoción:** llama a `POST /store/promotions/evaluate` con el producto y muestra el ahorro potencial
- Botón "Agregar al carrito"
- Descripción del producto
- Vendedor: nombre con link a `/vendedor/[handle]`

---

### 5. Carrito `/carrito`
- Lista de ítems: imagen, nombre, variante, cantidad (+ / −), precio
- **Sección de ahorros:** llama a `POST /store/promotions/evaluate` con todos los ítems y muestra las promociones aplicadas
- Subtotal, descuentos, total
- Botón "Ir al Checkout"

---

### 6. Checkout `/checkout`

Flujo en pasos:

**Paso 1 — Dirección de envío**
- Formulario: nombre, apellido, dirección, ciudad, teléfono
- `POST /store/carts/:id/shipping-address`

**Paso 2 — Envío**
- Lista opciones de envío: `GET /store/shipping-options?cart_id=...`
- Seleccionar opción: `POST /store/carts/:id/shipping-methods`

**Paso 3 — Pago**
- Inicializar sesión de pago: `POST /store/payment-collections`
- Por ahora: pago contra entrega como única opción
- `POST /store/carts/:id/complete`

**Paso 4 — Confirmación**
- Redirige a `/pedido/[id]`

---

### 7. Confirmación de pedido `/pedido/[id]`
- Número de orden
- Resumen de ítems comprados
- Total pagado
- Dirección de entrega
- Mensaje de seguimiento

---

### 8. Perfil vendedor `/vendedor/[handle]`
- Nombre y descripción del vendedor
- Logo (si tiene)
- Grid de productos del vendedor via `GET /store/products?vendor_handle=handle` (requiere implementar filtro en store)
- Nota: si el filtro por vendor en store no está, mostrar todos los productos vinculados via admin query

---

### 9. FAQ `/faq`
- Grupos por categoría
- Acordeón pregunta / respuesta
- Datos de `GET /store/cms/faq`

---

### 10. Páginas CMS `/[slug]`
- Título de la página
- Contenido markdown renderizado
- Datos de `GET /store/cms/pages/:slug`

---

## Cliente Medusa (`lib/medusa.ts`)

```typescript
const BASE = process.env.NEXT_PUBLIC_MEDUSA_URL!
const PK = process.env.NEXT_PUBLIC_PUBLISHABLE_KEY!

export async function storeGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { "x-publishable-api-key": PK },
    next: { revalidate: 60 },
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}

export async function storePost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": PK,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${path}`)
  return res.json()
}
```

---

## Cart Context (`context/cart-context.tsx`)

Estado a manejar:
```typescript
type CartState = {
  cartId: string | null        // Persiste en localStorage
  items: LineItem[]
  total: number
  count: number
  addItem: (variantId: string, quantity: number) => Promise<void>
  removeItem: (lineItemId: string) => Promise<void>
  updateItem: (lineItemId: string, quantity: number) => Promise<void>
  clearCart: () => void
}
```

- `cartId` persiste en `localStorage` bajo la clave `mt_cart_id`
- Al montar, si existe `cartId` hace `GET /store/carts/:id` para rehidratar
- Si no existe, crea nuevo con `POST /store/carts`

---

## Formateo de precios

Medusa guarda los precios en centavos (enteros). Para Guatemala:
```typescript
// Q 150.00
export const formatGTQ = (amount: number) =>
  new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ" }).format(amount / 100)
```

---

## Orden de implementación

1. **Setup Next.js** — `create-next-app` en `/frontend`, configurar Tailwind, shadcn/ui, env
2. **`lib/medusa.ts`** — cliente fetch base
3. **Cart Context** — estado global, persistencia en localStorage
4. **Layout (Header + Footer)** — estructura base navegable
5. **Home** — banners + categorías + productos destacados
6. **Categoría** — grid de productos + paginación
7. **Producto** — detalle + variantes + agregar al carrito + badge de promo
8. **Carrito** — lista + evaluación de promociones + totales
9. **Checkout** — flujo 4 pasos
10. **Confirmación de pedido**
11. **Perfil vendedor**
12. **FAQ y páginas CMS**

---

## Backend — endpoint adicional necesario

Para la página del vendedor, agregar en Sprint 6:

`GET /store/vendors/:handle` — perfil público del vendedor
```json
{ "vendor": { "id": "...", "name": "...", "description": "...", "logo_url": "..." } }
```

`GET /store/products?vendor_id=...` — actualmente Medusa no filtra por vendor nativo.
Alternativa: crear `GET /store/vendors/:handle/products` que haga query.graph desde el lado del vendor.

---

## Smoke tests

```bash
# Verificar que el frontend levanta
open http://localhost:3000

# Home carga banners
# Navegar a una categoría → productos aparecen
# Abrir un producto → se puede agregar al carrito
# El badge del header muestra la cantidad correcta
# Ir a /carrito → ítems listados con totales
# Checkout paso 1 → dirección se guarda
# /faq → preguntas aparecen agrupadas por categoría
# /terminos → página CMS se renderiza
```

---

## Notas técnicas

- Usar `revalidate: 60` en Server Components para cache de 60s en productos/categorías.
- El carrito es 100% Client Component (estado mutable por el usuario).
- La evaluación de promociones se llama en client-side (depende del carrito actual).
- shadcn/ui provee: Button, Input, Badge, Accordion (para FAQ), Sheet (para cart drawer).
- Los precios en Medusa son enteros (centavos). Dividir por 100 para mostrar. La moneda del region es la configurada en el admin (GTQ).
