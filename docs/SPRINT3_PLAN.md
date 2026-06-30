# Sprint 3 — Extensiones de Producto, Vínculos de Marketplace y UI de Asignación

Versión: 1.0
Fecha: 2026-06-05
Basado en: BACKEND_PLAN.md, SPRINT2_PLAN.md
Prerequisito: Sprint 2 completado y validado

---

## Objetivo

Completar el modelo de datos del marketplace conectando productos con sus marcas y vendedores, extender el modelo de producto con campos propios de MiTienda (`wholesale_price`, `weight`), vincular órdenes a vendedores para trazabilidad, y exponer todo esto en el dashboard de administración.

Al finalizar este sprint:
- Un administrador puede asignar brand y vendor a cualquier producto desde el dashboard.
- Cada producto puede tener precio mayorista y peso definidos sin modificar tablas nativas de Medusa.
- Cada orden puede vincularse a un vendedor para trazabilidad del marketplace.
- Las páginas de Marcas, Vendors y Reglas de Envío del dashboard tienen formulario de edición completo.

---

## Alcance

| Entregable | Prioridad | Descripción |
|---|---|---|
| Módulo `product-extension` | Alta | Campos `wholesale_price` y `weight` propios de MiTienda |
| Link `product ↔ product-extension` | Alta | 1:1, extiende producto sin tocar tablas nativas |
| Link `order ↔ vendor` | Alta | Trazabilidad de órdenes por vendor en el marketplace |
| API de asignación product-brand | Alta | `POST /admin/products/:id/brand` |
| API de asignación product-vendor | Alta | `POST /admin/products/:id/vendor` |
| API de asignación order-vendor | Alta | `POST /admin/orders/:id/vendor` |
| API de consulta enriquecida de producto | Alta | `GET /admin/products/:id/relations` — producto con brand + vendor + extension |
| Widget Admin: Brand/Vendor en producto | Alta | Widget en la ficha de producto del dashboard |
| Admin UI: formularios de edición | Media | Editar Marca, Vendor, Regla de Envío desde las páginas del Sprint 2 |

**Fuera de alcance en este sprint:**
- Módulo CMS (Sprint 5)
- Motor de promociones / Mayoreo (Sprint 4)
- Link `vendor ↔ customer` (Sprint 4, cuando se diseñe el rol de vendedor registrado)
- Frontend Next.js (Sprint 6)

---

## Contexto Técnico

### Cómo se asignan vínculos entre módulos en runtime

En Medusa v2, los link modules (`defineLink`) crean tablas de join gestionadas por el framework. Para crear o eliminar un vínculo en runtime se usa `remoteLink` desde el contenedor de dependencias:

```typescript
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

// Crear vínculo
await remoteLink.create({
  [Modules.PRODUCT]: { product_id: "prod_01..." },
  [BRAND_MODULE]: { mt_brand_id: "mtbrd_01..." },
})

// Eliminar vínculo
await remoteLink.dismiss({
  [Modules.PRODUCT]: { product_id: "prod_01..." },
  [BRAND_MODULE]: { mt_brand_id: "mtbrd_01..." },
})
```

### Cómo se consultan entidades con sus vínculos

Para obtener un producto con sus relaciones cruzadas se usa `query.graph`:

```typescript
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

const { data: products } = await query.graph({
  entity: "product",
  fields: ["id", "title", "brand.*", "vendor.*"],
  filters: { id: "prod_01..." },
})
```

El campo `brand.*` funciona porque existe el link `product ↔ mtBrand`. Medusa resuelve el join automáticamente.

### Extensión de Product sin modificar tablas nativas

Para agregar `wholesale_price` y `weight` a productos:
- Se crea un módulo `product-extension` con entidad `MtProductExtension`.
- Se crea un link 1:1: `product ↔ mtProductExtension`.
- La tabla `mt_product_extension` vive en nuestras migraciones, no en las de Medusa.
- Se puede consultar como `product.extension.*` via `query.graph`.

---

## Módulo `product-extension`

### Propósito

Almacenar campos propios de MiTienda que no existen en el modelo nativo `Product` de Medusa: precio mayorista y peso.

### Modelo — `MtProductExtension`

| Campo | Tipo DML | Requerido | Default | Descripción |
|---|---|---|---|---|
| `id` | `model.id({ prefix: "mtpex" })` | Sí | Auto | PK con prefijo `mtpex_` |
| `wholesale_price` | `model.number().nullable()` | No | null | Precio mayorista en centavos (GTQ × 100) |
| `weight` | `model.number().nullable()` | No | null | Peso del producto en gramos |
| `metadata` | `model.json().nullable()` | No | null | Datos extendidos no estructurados |
| `created_at` | Auto | — | Auto | Timestamp de creación |
| `updated_at` | Auto | — | Auto | Timestamp de última modificación |

**Tabla generada:** `mt_product_extension`

### API Routes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/products/:id/extension` | Obtener extensión del producto |
| `POST` | `/admin/products/:id/extension` | Crear o actualizar extensión |

**Nota:** Es un registro 1:1 por producto. Si no existe, se crea. Si existe, se actualiza (upsert).

---

## Link `product ↔ product-extension`

**Archivo:** `src/links/product-extension.ts`

```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductExtensionModule from "../modules/product-extension"

export default defineLink(
  ProductModule.linkable.product,
  { linkable: ProductExtensionModule.linkable.mtProductExtension, isList: false }
)
```

**Nota:** Se usa `isList: false` para forzar relación 1:1 en lugar del default 1:N.

---

## Link `order ↔ vendor`

**Archivo:** `src/links/order-vendor.ts`

```typescript
import { defineLink } from "@medusajs/framework/utils"
import OrderModule from "@medusajs/medusa/order"
import VendorModule from "../modules/vendor"

export default defineLink(
  OrderModule.linkable.order,
  VendorModule.linkable.mtVendor
)
```

**Tabla generada:** administrada por Medusa en la tabla de links de `order ↔ mt_vendor`.

### API Routes de `order-vendor`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/orders/:id/vendor` | Obtener vendor de la orden |
| `POST` | `/admin/orders/:id/vendor` | Asignar vendor a la orden |
| `DELETE` | `/admin/orders/:id/vendor` | Desasignar vendor de la orden |

---

## API de Asignación `product ↔ brand`

**Archivo:** `src/api/admin/products/[id]/brand/route.ts`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `GET` | `/admin/products/:id/brand` | — | Obtener marca asignada al producto |
| `POST` | `/admin/products/:id/brand` | `{ brand_id: "mtbrd_..." }` | Asignar o cambiar marca |
| `DELETE` | `/admin/products/:id/brand` | — | Quitar marca del producto |

**Implementación via remoteLink:**
```typescript
await remoteLink.create({
  [Modules.PRODUCT]: { product_id: req.params.id },
  [BRAND_MODULE]: { mt_brand_id: req.body.brand_id },
})
```

---

## API de Asignación `product ↔ vendor`

**Archivo:** `src/api/admin/products/[id]/vendor/route.ts`

| Método | Ruta | Body | Descripción |
|---|---|---|---|
| `GET` | `/admin/products/:id/vendor` | — | Obtener vendor asignado al producto |
| `POST` | `/admin/products/:id/vendor` | `{ vendor_id: "mtvnd_..." }` | Asignar o cambiar vendor |
| `DELETE` | `/admin/products/:id/vendor` | — | Quitar vendor del producto |

---

## API de Consulta Enriquecida

**Archivo:** `src/api/admin/products/[id]/relations/route.ts`

`GET /admin/products/:id/relations` — Devuelve el producto con brand, vendor y extension resueltos en una sola llamada.

```json
{
  "product": {
    "id": "prod_01...",
    "title": "Laptop Samsung",
    "brand": { "id": "mtbrd_01...", "name": "Samsung", "handle": "samsung" },
    "vendor": { "id": "mtvnd_01...", "name": "Distribuidora Central" },
    "extension": { "wholesale_price": 75000, "weight": 1800 }
  }
}
```

Este endpoint es el que consumen los widgets del dashboard.

---

## Admin UI — Widget de Brand/Vendor en Producto

**Archivos:**
- `src/admin/widgets/product-brand-widget.tsx`
- `src/admin/widgets/product-vendor-widget.tsx`

Los widgets de Medusa v2 se inyectan en zonas del dashboard existente usando `defineWidgetConfig`:

```typescript
import { defineWidgetConfig } from "@medusajs/admin-sdk"

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})
```

### Widget de Marca

- Se muestra en el panel lateral de la ficha de cada producto.
- Si el producto tiene marca asignada, la muestra con badge y botón "Cambiar".
- Si no tiene marca, muestra "Sin marca" con botón "Asignar Marca".
- Al hacer clic abre un select con todas las marcas activas.
- Guarda via `POST /admin/products/:id/brand`.

### Widget de Vendor

- Mismo patrón que el widget de marca.
- Se muestra debajo del widget de marca en la zona `product.details.side.before`.
- Permite asignar/cambiar/quitar el vendor del producto.

---

## Admin UI — Formularios de Edición (Sprint 2 pages)

Completar las páginas creadas en Sprint 2 agregando edición por fila. Patrón: al hacer clic en "Editar" de una fila, esa fila se convierte en un formulario inline con los campos pre-poblados.

### Página de Marcas — edición inline

Campos editables: `name`, `handle`, `website_url`, `description`, `logo_url`.
Guardar via `PATCH /admin/brands/:id`.

### Página de Vendors — edición inline

Campos editables: `name`, `handle`, `contact_email`, `contact_phone`, `city`, `commission_rate`.
Guardar via `PATCH /admin/vendors/:id`.

### Página de Reglas de Envío — edición inline

Campos editables: `name`, `region_code`, `flat_rate` (en Q), `free_above_amount` (en Q), `priority`.
Guardar via `PATCH /admin/shipping-rules/:id`.

---

## Roadmap Técnico Detallado

### Fase 1 — Módulo `product-extension`

**Tarea 1.1 — Crear el modelo**
- Crear `src/modules/product-extension/models/product-extension.ts`
- Definir `MtProductExtension` con `model.define("MtProductExtension", { ... })`

**Tarea 1.2 — Crear el servicio**
- Crear `src/modules/product-extension/service.ts`
- Extender `MedusaService({ MtProductExtension })`

**Tarea 1.3 — Crear los tipos**
- Crear `src/modules/product-extension/types/index.ts`
- Definir `CreateProductExtensionInput`, `UpdateProductExtensionInput`

**Tarea 1.4 — Crear el index del módulo**
- Crear `src/modules/product-extension/index.ts`
- Exportar `PRODUCT_EXTENSION_MODULE = "product_extension"`
- Exportar `default` con `Module(...)`

**Tarea 1.5 — Registrar en medusa-config.ts**
- Agregar módulo al array `modules` con `resolve: "./src/modules/product-extension"`

**Tarea 1.6 — Crear el link product ↔ product-extension**
- Crear `src/links/product-extension.ts`

**Tarea 1.7 — Generar migraciones y migrar**
```bash
npm run db:generate -- product_extension
npm run db:migrate
```

**Tarea 1.8 — Crear API routes**
- Crear `src/api/admin/products/[id]/extension/route.ts` (GET + POST upsert)

**Tarea 1.9 — Smoke test**
- Crear producto en el dashboard, luego via API asignar `wholesale_price` y `weight`
- Verificar que `GET /admin/products/:id/extension` devuelve los datos

---

### Fase 2 — Link `order ↔ vendor`

**Tarea 2.1 — Crear el link**
- Crear `src/links/order-vendor.ts`
- `defineLink(OrderModule.linkable.order, VendorModule.linkable.mtVendor)`

**Tarea 2.2 — Migrar**
```bash
npm run db:migrate
```
- El link genera su tabla de join. Verificar que aparece en `\dt` de PostgreSQL.

**Tarea 2.3 — Crear API routes**
- Crear `src/api/admin/orders/[id]/vendor/route.ts` (GET + POST + DELETE)

**Tarea 2.4 — Smoke test**
- Obtener el ID de una orden existente del dashboard
- Asignar un vendor: `POST /admin/orders/:id/vendor`
- Verificar: `GET /admin/orders/:id/vendor`

---

### Fase 3 — API de asignación product ↔ brand/vendor

**Tarea 3.1 — Crear rutas de brand en producto**
- Crear `src/api/admin/products/[id]/brand/route.ts`
- GET: consulta con `query.graph` fields `["brand.*"]`
- POST: usa `remoteLink.create()` con `[Modules.PRODUCT]` y `[BRAND_MODULE]`
- DELETE: usa `remoteLink.dismiss()`

**Tarea 3.2 — Crear rutas de vendor en producto**
- Crear `src/api/admin/products/[id]/vendor/route.ts`
- Mismo patrón que brand

**Tarea 3.3 — Crear endpoint de consulta enriquecida**
- Crear `src/api/admin/products/[id]/relations/route.ts`
- `query.graph` con fields `["id", "title", "brand.*", "vendor.*", "extension.*"]`

**Tarea 3.4 — Actualizar middlewares.ts**
- Agregar auth para las nuevas rutas:
  - `/admin/products/*/brand*`
  - `/admin/products/*/vendor*`
  - `/admin/products/*/extension*`
  - `/admin/products/*/relations*`
  - `/admin/orders/*/vendor*`

**Tarea 3.5 — Smoke test completo de asignaciones**
```bash
# Obtener un producto existente
GET /admin/products (tomar el primer ID)

# Asignar marca al producto
POST /admin/products/:id/brand
{ "brand_id": "mtbrd_01KTCMBVHRWVTD5BVAVFY0BD88" }

# Asignar vendor al producto
POST /admin/products/:id/vendor
{ "vendor_id": "mtvnd_01..." }

# Asignar extensión
POST /admin/products/:id/extension
{ "wholesale_price": 75000, "weight": 1800 }

# Consultar todo junto
GET /admin/products/:id/relations
```
Verificar que el response incluye `brand`, `vendor` y `extension` anidados.

---

### Fase 4 — Admin UI Widgets

**Tarea 4.1 — Widget de Marca en producto**
- Crear `src/admin/widgets/product-brand-widget.tsx`
- `defineWidgetConfig({ zone: "product.details.side.before" })`
- Fetch a `GET /admin/products/:id/brand` para mostrar marca actual
- Select cargado desde `GET /admin/brands` para cambiar marca
- Guardar via `POST /admin/products/:id/brand`
- Quitar via `DELETE /admin/products/:id/brand`

**Tarea 4.2 — Widget de Vendor en producto**
- Crear `src/admin/widgets/product-vendor-widget.tsx`
- Mismo patrón, zona: `product.details.side.before`
- Usa `GET/POST/DELETE /admin/products/:id/vendor`

**Tarea 4.3 — Verificar widgets en dashboard**
- Abrir cualquier producto en `http://localhost:9000/app/products/:id`
- Confirmar que los dos widgets aparecen en el panel lateral
- Probar asignación de marca y vendor desde la UI

---

### Fase 5 — Formularios de Edición (Sprint 2 pages)

**Tarea 5.1 — Edición inline en Marcas**
- En `src/admin/routes/brands/page.tsx`
- Agregar estado `editingId: string | null`
- Al hacer clic en "Editar", la fila se reemplaza por inputs pre-poblados
- Guardar via `PATCH /admin/brands/:id`, cancelar restaura la fila

**Tarea 5.2 — Edición inline en Vendors**
- Mismo patrón en `src/admin/routes/vendors/page.tsx`

**Tarea 5.3 — Edición inline en Reglas de Envío**
- Mismo patrón en `src/admin/routes/shipping-rules/page.tsx`
- Convertir centavos → quetzales al cargar, quetzales → centavos al guardar

---

### Fase 6 — Validación del Sprint 3

**Tarea 6.1 — Smoke test de base de datos**
```sql
-- Verificar tabla de extensión
\dt mt_product_extension

-- Verificar que un producto tiene extensión asignada
SELECT * FROM mt_product_extension LIMIT 5;
```

**Tarea 6.2 — Smoke test de API completo**
```bash
# Flujo completo de producto enriquecido
GET  /admin/products/:id/relations      → { brand, vendor, extension }
POST /admin/products/:id/brand          → asignar marca
POST /admin/products/:id/vendor         → asignar vendor
POST /admin/products/:id/extension      → asignar wholesale_price y weight
GET  /admin/products/:id/relations      → verificar todo junto

# Trazabilidad de orden
POST /admin/orders/:id/vendor           → asignar vendor a orden
GET  /admin/orders/:id/vendor           → verificar vendor de la orden
```

**Tarea 6.3 — Smoke test de UI**
- Abrir producto en dashboard → ver widgets de marca y vendor en sidebar
- Asignar marca desde el widget → verificar actualización sin reload
- Editar una marca desde la página de Marcas → verificar que el cambio persiste

**Criterio de aceptación:**
- La tabla `mt_product_extension` existe y acepta datos.
- Un producto devuelve `brand`, `vendor` y `extension` en una sola query.
- Los widgets aparecen en la ficha de producto del dashboard.
- Las páginas de Marcas, Vendors y Reglas tienen edición funcional.
- Las órdenes pueden vincularse a un vendor.

---

## Orden de Implementación Recomendado

```
product-extension (módulo + link + API)
→ order-vendor (link + API)
→ product-brand/vendor APIs (remoteLink)
→ consulta enriquecida
→ Widgets de Admin UI
→ Edición inline en páginas Sprint 2
→ Validación completa
```

Las fases 1 y 2 son independientes entre sí y pueden implementarse en paralelo. Las fases 3 en adelante dependen de que los módulos y links estén migrados.

---

## Comandos de Referencia para el Sprint

```bash
# Desde /Users/admin/Documents/mitienda-v2/backend

# Generar migración para product-extension
npm run db:generate -- product_extension

# Aplicar migraciones (también migra los nuevos links)
npm run db:migrate

# Verificar tablas propias en PostgreSQL
psql $DATABASE_URL -c '\dt mt_*'

# Verificar tablas de links de Medusa
psql $DATABASE_URL -c "\dt" | grep -E "product.*brand|product.*vendor|order.*vendor|product.*extension"

# Servidor de desarrollo
npm run dev
```

---

## Riesgos Técnicos del Sprint 3

### Riesgo 1 — `query.graph` y nombres de campos de links
**Nivel:** Medio
**Descripción:** Los campos de relación en `query.graph` (como `"brand.*"`) dependen de cómo Medusa nombra internamente el link. Si el campo no se llama `brand` sino `mtBrand` o `mt_brand`, el query devuelve el campo vacío sin error.
**Mitigación:** Antes de construir la API de consulta enriquecida, hacer un `console.log` del resultado de `query.graph` con fields `["*"]` para inspeccionar los nombres reales de las relaciones disponibles.

### Riesgo 2 — `remoteLink.create` con IDs incorrectos
**Nivel:** Medio
**Descripción:** Si el `product_id` o `mt_brand_id` no existen en sus respectivas tablas, `remoteLink.create` puede fallar con un error de FK o simplemente guardar un vínculo huérfano.
**Mitigación:** Validar la existencia de los IDs antes de llamar a `remoteLink.create`. Usar `brandService.retrieveMtBrand(brand_id)` y el servicio de producto para verificar existencia.

### Riesgo 3 — `isList: false` en defineLink 1:1
**Nivel:** Medio
**Descripción:** La sintaxis exacta para definir un link 1:1 en Medusa v2 puede variar según la versión. Si `isList: false` no es soportado en v2.15.x, el link se comportará como 1:N.
**Mitigación:** Al implementar el link `product-extension`, verificar el comportamiento real. Si el link crea múltiples extensiones por producto en lugar de una, ajustar la API para filtrar y devolver solo la más reciente, o reevaluar la sintaxis de `defineLink`.

### Riesgo 4 — Zona de widgets en el dashboard
**Nivel:** Bajo
**Descripción:** La zona `"product.details.side.before"` es la documentada por Medusa para el panel lateral del detalle de producto. Si en v2.15.5 la zona tiene un nombre diferente, el widget no aparece sin error en consola.
**Mitigación:** Verificar las zonas disponibles consultando la documentación oficial o el código fuente de `@medusajs/dashboard`. Las zonas alternativas posibles son `"product.details.after"` o `"product.details.before"`.

### Riesgo 5 — Auth middleware para rutas anidadas de producto
**Nivel:** Bajo
**Descripción:** Las rutas `/admin/products/:id/brand` y `/admin/products/:id/vendor` son rutas personalizadas que Medusa no protege automáticamente. El middleware de auth en `middlewares.ts` debe cubrir estos patrones.
**Mitigación:** Usar el matcher `/admin/products/*` en lugar de matchers específicos por subruta, para cubrir todas las extensiones de producto a la vez.

---

## Notas para Sprints Siguientes

- **Sprint 4 (Mayoreo):** Antes de construir código propio en `promotion-engine`, verificar si el tipo `BUYGET` nativo de Medusa soporta el caso exacto: comprar 3 del mismo producto → descuento sobre esos mismos 3. Si no lo soporta, el módulo `promotion-engine` extiende el comportamiento.
- **Sprint 4 (Vendor-Customer):** El link `vendor ↔ customer` se implementa cuando se diseñe el rol de vendedor auto-registrado: un vendor puede tener una cuenta de cliente asociada para hacer pedidos en nombre propio.
- **Sprint 5 (CMS):** El módulo `cms` incluye `MtBanner`, `MtFaq` y `MtPolicy` con sus respectivos endpoints store para consumo del frontend.
- **Sprint 6 (Frontend):** El Next.js consume los endpoints store (`/store/brands`, `/store/vendors`) y los endpoints enriquecidos de producto que se definen en este sprint.
