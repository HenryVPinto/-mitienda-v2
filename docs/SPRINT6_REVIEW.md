# Sprint 6 — Review & Bugs Resueltos

Sprint 6 completado y en fase de pulido. Frontend en `/frontend/` con Next.js 15, App Router, Tailwind v4, shadcn/ui (base-ui variant).

---

## Stack instalado

- Next.js 15.5, React 19, TypeScript
- Tailwind CSS v4 + shadcn/ui 4.10 (usa `@base-ui/react` — NO tiene `asChild` en Button)
- Lucide-react (sin iconos de redes sociales — usar SVGs inline para Facebook/Instagram/YouTube)

---

## Páginas creadas

| Ruta | Descripción |
|------|-------------|
| `/` | Home: banners, trust badges, categorías, productos, marcas, ofertas |
| `/categoria/[handle]` | Catálogo con paginación y orden |
| `/producto/[handle]` | Detalle: galería con zoom, variantes (color/talla), precios por volumen |
| `/carrito` | Lista de ítems + descuentos por volumen + evaluación de promociones |
| `/checkout` | Flujo 3 pasos: dirección → envío → pago contra entrega |
| `/pedido/[id]` | Confirmación de orden con detalle completo |
| `/vendedor/[handle]` | Perfil público del vendedor |
| `/emprendedores` | Mercado: grid de logos de vendors |
| `/faq` | Acordeón agrupado por categoría |
| `/[slug]` | Páginas CMS estáticas |
| `/buscar` | Búsqueda de productos |

---

## Decisiones técnicas

- Compradores siempre como invitados (sin auth en storefront)
- Logo en `public/` — el usuario lo agrega manualmente
- Precios por volumen: de Medusa Price Lists; se almacenan como metadata en line items (`base_unit_price`, `tier_rules`) para recalcular en el carrito client-side
- Color primario verde: `oklch(0.45 0.14 145)`, naranja precios: `--color-brand-orange`
- Imágenes de Medusa servidas desde `localhost:9000/static/` — requiere `port` en `next.config.ts` remotePatterns

---

## Endpoints backend usados

- `GET /store/products`, `/store/product-categories`, `/store/regions`
- `GET /store/vendors`, `/store/vendors/:handle`
- `GET /store/cms/banners`, `/store/cms/faq`, `/store/cms/pages`, `/store/cms/pages/:slug`
- `POST /store/promotions/evaluate`
- `POST /store/carts/:id` — dirección (Medusa v2 usa POST, no PATCH)
- `POST /store/carts/:id/shipping-methods`
- `POST /store/payment-collections`
- `POST /store/payment-collections/:id/payment-sessions` — `provider_id: "pp_system_default"`
- `POST /store/carts/:id/complete`

---

## Bugs resueltos en sesión de pulido (2026-06-06)

### 1. "Error al guardar la dirección" en checkout

**Causa:** Después de completar un pedido, el cart ID queda en `localStorage`. El siguiente checkout usaba el carrito ya completado y Medusa rechazaba el POST.

**Fix:** En `src/lib/cart.ts`, `getOrCreateCart()` ahora verifica `cart.completed_at` — si está seteado, descarta el ID y crea uno nuevo.

**Archivos:** `src/lib/cart.ts`, `src/lib/types.ts` (campo `completed_at` agregado al tipo `Cart`).

---

### 2. "The cart items require shipping profiles that are not satisfied"

**Causa principal:** La relación producto → shipping profile se guarda en la tabla join `product_shipping_profile`, NO como columna directa en `product`. El API de admin devuelve `None` para el campo aunque sí lo guarda — es comportamiento normal de Medusa v2.

**Causa secundaria:** La variante tenía `manage_inventory: true` sin stock location asignado → Medusa bloqueaba el `complete`. El API endpoint no actualizó el campo; se resolvió con UPDATE directo en DB:

```sql
UPDATE product_variant SET manage_inventory = false WHERE id = '...';
```

**Regla:** Todos los productos nuevos deben crearse con **Manage Inventory = OFF** en el admin de Medusa.

---

### 3. Imágenes no aparecen en carrito y drawer

**Causa 1 — next.config.ts:** `remotePatterns` para localhost necesita `port: "9000"` — sin el port no matchea `localhost:9000`.

```ts
{ protocol: "http", hostname: "localhost", port: "9000" }
```

**Causa 2 — componentes:** `thumbnail` es `null` en todos los productos; las imágenes solo están en el array `product.images`. Usar siempre la cadena de fallback:

```ts
item.thumbnail
  ?? item.variant?.product?.thumbnail
  ?? item.variant?.product?.images?.[0]?.url
  ?? null
```

**Archivos corregidos:** `next.config.ts`, `src/app/carrito/page.tsx`, `src/components/cart/cart-drawer.tsx`.

---

## Requisitos para checkout completo — pitfalls Medusa v2

1. **Shipping profile:** Productos deben estar en la tabla `product_shipping_profile` vinculados al Default Shipping Profile. El API retorna `None` para el campo pero el dato sí se guarda (verificar directo en DB).

2. **Inventory:** Variantes con `manage_inventory: true` requieren inventory items stocked en una stock location. Para este proyecto usar `manage_inventory: false` en todas las variantes.

3. **Shipping setup ya configurado:**
   - Stock location → fulfillment provider (manual) → fulfillment set → service zone (`country: gt`)
   - Opciones: Envío Estándar (Q25), Envío Gratis (Q0)

---

## Pendientes (pulido en curso)

### Contenido y datos
- [ ] **Slider principal (Home):** cargar banners reales desde el CMS — imágenes, títulos y links correctos
- [ ] **Categorías:** poblar con imágenes y nombres definitivos en Medusa admin
- [ ] **Links generales:** revisar y completar links del header, footer y navegación (algunos apuntan a `#`)
- [ ] **Contenido general de secciones:** textos, trust badges, sección de marcas, ofertas destacadas — ajustar con contenido real

### Detalle de producto
- [ ] **Colores en variantes:** metadata key/value no persiste correctamente desde el admin de Medusa — investigar cómo guardar `color_hex` por variante para mostrar swatches
- [ ] **Imágenes por variante de color:** al seleccionar una variante de color, la galería debe mostrar las fotos de ese color específico

### Funcionalidades
- [ ] **Cuenta de emprendedores:** registro, login y panel para vendedores (fuera de scope Sprint 6 — planificar en sprint dedicado)
- [ ] **product_id en evaluación de promociones:** el carrito envía `handle` en lugar de `id` al endpoint `/store/promotions/evaluate` — requiere incluir `product.id` en los fields del cart
- [ ] Revertir mensaje de error del checkout a texto amigable cuando esté listo para producción
