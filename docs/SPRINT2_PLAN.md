# Sprint 2 — Modelo de Datos MiTienda

Versión: 1.0
Fecha: 2026-06-05
Basado en: BACKEND_PLAN.md, ARCHITECTURE.md, PROJECT_CONTEXT.md
Prerequisito: Sprint 1 completado y validado

---

## Objetivo

Diseñar e implementar las entidades personalizadas de MiTienda como módulos propios de Medusa v2. Al finalizar este sprint, el backend tendrá un modelo de datos preparado para el marketplace y la gestión de marcas, vendedores y reglas de envío.

---

## Alcance

| Entregable | Prioridad |
|---|---|
| Módulo `brand` | Alta |
| Módulo `vendor` | Alta |
| Módulo `shipping-rules` | Media |
| Link `product ↔ brand` | Alta |
| Link `product ↔ vendor` | Alta |
| API Routes para cada módulo | Alta |
| Registro en medusa-config.ts | Alta |

**Fuera de alcance en este sprint:**
- Módulo CMS (Sprint 5)
- Motor de promociones (Sprint 4)
- Link `order ↔ vendor` (Sprint 3)
- Extensiones `wholesale_price` y `weight` (Sprint 3)
- Frontend (Sprint 6)

---

## Contexto Arquitectónico

### Patrón de módulo en Medusa v2

Todo módulo personalizado en Medusa v2 sigue esta estructura fija:

```
src/modules/<nombre>/
├── index.ts          → Define y exporta el módulo con Module()
├── service.ts        → Extiende MedusaService con la lógica del módulo
├── models/
│   └── <entidad>.ts  → Define el modelo de datos con model.define()
├── migrations/       → Generadas automáticamente por medusa db:generate
└── types/
    └── index.ts      → Tipos TypeScript del módulo (interfaces, DTOs)
```

Todos los helpers del framework provienen de `@medusajs/framework/utils`:
- `model` — DML para definir entidades
- `MedusaService` — clase base del servicio con CRUD auto-generado
- `Module` — función que define el módulo y lo hace registrable
- `defineLink` — función para crear vínculos entre módulos

### Nomenclatura de tablas

El nombre de la entidad en `model.define()` se convierte a `snake_case` para la tabla. Para garantizar el prefijo `mt_` en todas las tablas propias, los nombres de entidad deben comenzar con `Mt`:

| Entidad | Tabla generada |
|---|---|
| `MtBrand` | `mt_brand` |
| `MtVendor` | `mt_vendor` |
| `MtShippingRule` | `mt_shipping_rule` |

Este patrón fue acordado en BACKEND_PLAN.md §3 para evitar colisiones con tablas presentes o futuras del framework.

### Valores monetarios

Guatemala usa Quetzales (GTQ). Todos los valores monetarios se almacenan como enteros en **centavos** (igual que Medusa en toda su codebase). Ejemplo: Q25.00 se almacena como `2500`.

---

## Módulo Brand

### Propósito

Representa marcas comerciales cuyos productos se venden en MiTienda. Un producto puede pertenecer a una marca. Las marcas son navegables por los clientes (filtrado por marca).

### Modelo de datos — `MtBrand`

Tabla: `mt_brand`
Prefijo de ID: `mtbrd`

| Campo | Tipo DML | Restricciones | Descripción |
|---|---|---|---|
| `id` | `model.id({ prefix: "mtbrd" })` | PK | Identificador único con prefijo |
| `name` | `model.text()` | NOT NULL | Nombre comercial de la marca |
| `handle` | `model.text()` | NOT NULL, UNIQUE | Slug URL-safe (ej: `nike`, `samsung`) |
| `description` | `model.text()` | nullable | Descripción breve de la marca |
| `logo_url` | `model.text()` | nullable | URL del logotipo |
| `website_url` | `model.text()` | nullable | Sitio web oficial |
| `is_active` | `model.boolean()` | DEFAULT true | Controla visibilidad pública |
| `metadata` | `model.json()` | nullable | Datos extendidos en formato JSONB |
| `created_at` | automático | NOT NULL | Generado por MedusaService |
| `updated_at` | automático | NOT NULL | Generado por MedusaService |
| `deleted_at` | automático | nullable | Soft delete, generado por MedusaService |

**Índices:**

| Nombre | Columnas | Tipo | Condición |
|---|---|---|---|
| `idx_mt_brand_handle` | `handle` | UNIQUE | `WHERE deleted_at IS NULL` |
| `idx_mt_brand_is_active` | `is_active` | BTREE | — |

**Reglas de negocio:**
- `handle` debe ser único, lowercase, sin espacios (usar guiones).
- Un `handle` eliminado (soft delete) libera su unicidad para reutilización.
- La marca desactivada (`is_active: false`) no aparece en el storefront pero sus productos siguen asociados.

### Identificador del módulo

```
BRAND_MODULE = "brand"
```

Se usa este identificador al registrar el módulo en `medusa-config.ts` y al referenciar el módulo en link modules.

### Auto-generado por MedusaService

`MedusaService({ MtBrand })` genera automáticamente los siguientes métodos en el servicio:
- `listBrands(filters?, config?)` — listar marcas
- `listAndCountBrands(filters?, config?)` — listar con total
- `retrieveBrand(id, config?)` — obtener por ID
- `createBrands(data)` — crear una o varias
- `updateBrands(data)` — actualizar una o varias
- `deleteBrands(ids)` — soft delete por IDs

---

## Módulo Vendor

### Propósito

Representa emprendedores y vendedores del marketplace. Un vendedor puede tener múltiples productos. El Sprint 3 expandirá este módulo con roles y permisos.

### Modelo de datos — `MtVendor`

Tabla: `mt_vendor`
Prefijo de ID: `mtvnd`

| Campo | Tipo DML | Restricciones | Descripción |
|---|---|---|---|
| `id` | `model.id({ prefix: "mtvnd" })` | PK | Identificador único |
| `name` | `model.text()` | NOT NULL | Nombre del vendedor o emprendimiento |
| `handle` | `model.text()` | NOT NULL, UNIQUE | Slug para URL del perfil público |
| `description` | `model.text()` | nullable | Descripción del emprendimiento |
| `bio` | `model.text()` | nullable | Texto largo del perfil público |
| `logo_url` | `model.text()` | nullable | URL del logo del emprendimiento |
| `email` | `model.text()` | NOT NULL, UNIQUE | Correo de contacto del vendedor |
| `phone` | `model.text()` | nullable | Teléfono de contacto |
| `is_active` | `model.boolean()` | DEFAULT true | Controla visibilidad en marketplace |
| `metadata` | `model.json()` | nullable | Datos extendidos en JSONB |
| `created_at` | automático | NOT NULL | — |
| `updated_at` | automático | NOT NULL | — |
| `deleted_at` | automático | nullable | Soft delete |

**Índices:**

| Nombre | Columnas | Tipo | Condición |
|---|---|---|---|
| `idx_mt_vendor_handle` | `handle` | UNIQUE | `WHERE deleted_at IS NULL` |
| `idx_mt_vendor_email` | `email` | UNIQUE | `WHERE deleted_at IS NULL` |
| `idx_mt_vendor_is_active` | `is_active` | BTREE | — |

**Reglas de negocio:**
- `email` identifica al vendedor — debe ser único en el sistema.
- `handle` es el identificador público del emprendimiento (aparece en la URL del perfil).
- Un vendedor inactivo no aparece en el marketplace pero sus productos permanecen en la base de datos.
- La asociación entre un `Customer` de Medusa y un `MtVendor` se implementa en Sprint 3.

### Identificador del módulo

```
VENDOR_MODULE = "vendor"
```

---

## Módulo ShippingRules

### Propósito

Define las reglas de costo de envío de MiTienda. Permite configurar envío gratis por monto mínimo, tarifas planas y restricciones por rango de pedido. Este módulo es complementario al sistema de fulfillment nativo de Medusa.

### Modelo de datos — `MtShippingRule`

Tabla: `mt_shipping_rule`
Prefijo de ID: `mtshr`

| Campo | Tipo DML | Restricciones | Descripción |
|---|---|---|---|
| `id` | `model.id({ prefix: "mtshr" })` | PK | Identificador único |
| `name` | `model.text()` | NOT NULL | Nombre de la regla (ej: "Envío gratis +Q200") |
| `description` | `model.text()` | nullable | Descripción para el panel admin |
| `min_order_amount` | `model.number()` | nullable | Monto mínimo del pedido en centavos |
| `max_order_amount` | `model.number()` | nullable | Monto máximo del pedido en centavos |
| `flat_rate` | `model.number()` | DEFAULT 0 | Costo de envío fijo en centavos |
| `is_free` | `model.boolean()` | DEFAULT false | Si true, anula flat_rate y aplica envío gratis |
| `is_active` | `model.boolean()` | DEFAULT true | Controla si la regla está en efecto |
| `rank` | `model.number()` | DEFAULT 0 | Orden de evaluación cuando aplican múltiples reglas |
| `metadata` | `model.json()` | nullable | Datos extendidos |
| `created_at` | automático | NOT NULL | — |
| `updated_at` | automático | NOT NULL | — |
| `deleted_at` | automático | nullable | Soft delete |

**Índices:**

| Nombre | Columnas | Tipo |
|---|---|---|
| `idx_mt_shipping_rule_is_active` | `is_active` | BTREE |
| `idx_mt_shipping_rule_rank` | `rank` | BTREE |

**Reglas de negocio:**
- Si `is_free: true`, el campo `flat_rate` se ignora al calcular el costo.
- Si el pedido está dentro del rango `[min_order_amount, max_order_amount]`, la regla aplica.
- Si `min_order_amount` es null, la regla aplica desde Q0.
- Si `max_order_amount` es null, la regla aplica sin límite superior.
- El campo `rank` determina qué regla tiene prioridad cuando varias aplican.
- Este módulo no reemplaza el sistema de fulfillment de Medusa — es una capa de reglas de negocio adicional.

### Identificador del módulo

```
SHIPPING_RULES_MODULE = "shipping-rules"
```

---

## Estrategia de Link Modules

Los link modules conectan entidades de distintos módulos sin crear acoplamiento directo entre ellos. Medusa v2 genera automáticamente las tablas de join en la base de datos.

### product-brand — `src/links/product-brand.ts`

**Propósito:** Asocia un `Product` (módulo nativo) con un `MtBrand` (módulo propio).
**Cardinalidad:** Muchos productos → una marca (N:1 desde el producto).
**Tabla de join generada:** `product_brand` (gestionada por el framework).

**Patrón de implementación:**
```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import BrandModule from "../modules/brand"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: BrandModule.linkable.mtBrand,
    isList: false,
  }
)
```

**Qué habilita:**
- Query `product` con `brand` incluido en una sola llamada al container.
- Query `brand` con lista de `products` asociados.
- Asignar o cambiar la marca de un producto sin tocar el core de Medusa.

---

### product-vendor — `src/links/product-vendor.ts`

**Propósito:** Asocia un `Product` con un `MtVendor`.
**Cardinalidad:** Muchos productos → un vendedor (N:1 desde el producto).
**Tabla de join generada:** `product_vendor` (gestionada por el framework).

**Patrón de implementación:**
```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import VendorModule from "../modules/vendor"

export default defineLink(
  ProductModule.linkable.product,
  {
    linkable: VendorModule.linkable.mtVendor,
    isList: false,
  }
)
```

**Qué habilita:**
- Identificar el propietario (emprendedor) de cada producto.
- Filtrar productos por vendedor en el storefront.
- Base para el marketplace multi-vendor del Sprint 3.

---

### order-vendor — `src/links/order-vendor.ts`

**Estado:** Diferido al Sprint 3. La estructura del link se diseñará una vez que el módulo `vendor` esté operativo y el flujo de checkout multi-vendor esté definido.

---

## Registro en medusa-config.ts

Los tres módulos deben registrarse en el array `modules` de `medusa-config.ts`. Sin este paso, el servidor no carga los módulos aunque existan en el disco.

```typescript
modules: [
  {
    resolve: "./src/modules/brand",
    options: {},
  },
  {
    resolve: "./src/modules/vendor",
    options: {},
  },
  {
    resolve: "./src/modules/shipping-rules",
    options: {},
  },
],
```

El valor de `resolve` es la ruta relativa al directorio del proyecto. Medusa importa el `default export` del `index.ts` de cada módulo.

---

## Diseño de API Routes

### Rutas del Store (públicas)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/store/brands` | Listar marcas activas |
| `GET` | `/store/brands/:handle` | Obtener marca por handle |
| `GET` | `/store/vendors` | Listar vendedores activos |
| `GET` | `/store/vendors/:handle` | Obtener perfil de vendedor |
| `GET` | `/store/vendors/:handle/products` | Listar productos de un vendedor |

Las rutas de store no requieren autenticación. Solo retornan registros con `is_active: true`.

### Rutas del Admin (requieren autenticación JWT)

**Brands:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/brands` | Listar todas las marcas |
| `GET` | `/admin/brands/:id` | Obtener marca por ID |
| `POST` | `/admin/brands` | Crear marca |
| `POST` | `/admin/brands/:id` | Actualizar marca |
| `DELETE` | `/admin/brands/:id` | Eliminar marca (soft delete) |

**Vendors:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/vendors` | Listar todos los vendedores |
| `GET` | `/admin/vendors/:id` | Obtener vendedor por ID |
| `POST` | `/admin/vendors` | Crear vendedor |
| `POST` | `/admin/vendors/:id` | Actualizar vendedor |
| `DELETE` | `/admin/vendors/:id` | Eliminar vendedor (soft delete) |

**Shipping Rules:**

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/shipping-rules` | Listar todas las reglas |
| `POST` | `/admin/shipping-rules` | Crear regla |
| `POST` | `/admin/shipping-rules/:id` | Actualizar regla |
| `DELETE` | `/admin/shipping-rules/:id` | Eliminar regla |

**Nota:** En Medusa v2 las rutas de admin usan `POST` tanto para crear como para actualizar, siguiendo la convención del framework. No se usa `PUT` o `PATCH`.

---

## Roadmap Técnico Detallado

### Fase 1 — Módulo Brand

**Tarea 1.1 — Crear el modelo**
- Crear `src/modules/brand/models/brand.ts`
- Definir `MtBrand` con `model.define("MtBrand", { ... })`
- Incluir todos los campos del diseño de este documento

**Tarea 1.2 — Crear el servicio**
- Crear `src/modules/brand/service.ts`
- Extender `MedusaService({ MtBrand })`
- El CRUD básico es auto-generado

**Tarea 1.3 — Crear los tipos**
- Crear `src/modules/brand/types/index.ts`
- Definir `CreateBrandDTO`, `UpdateBrandDTO`, `BrandDTO`

**Tarea 1.4 — Crear el index del módulo**
- Crear `src/modules/brand/index.ts`
- Exportar `BRAND_MODULE` como constante
- Exportar `default` con `Module(BRAND_MODULE, { service: BrandModuleService })`

**Tarea 1.5 — Registrar en medusa-config.ts**
- Agregar el módulo brand al array `modules`
- Reiniciar el servidor y verificar que carga sin errores

**Tarea 1.6 — Generar migración**
```bash
npm run db:generate -- brand
npm run db:migrate
```
- Verificar que `mt_brand` existe en la base de datos: `\dt mt_brand`

**Tarea 1.7 — Crear API routes de admin**
- Crear `src/api/admin/brands/route.ts` (GET list, POST create)
- Crear `src/api/admin/brands/[id]/route.ts` (GET one, POST update, DELETE)

**Tarea 1.8 — Crear API routes de store**
- Crear `src/api/store/brands/route.ts` (GET list — solo is_active)
- Crear `src/api/store/brands/[handle]/route.ts` (GET by handle)

**Tarea 1.9 — Smoke test del módulo Brand**
- Crear una marca via `POST /admin/brands`
- Listar marcas via `GET /admin/brands`
- Verificar en el store via `GET /store/brands`

---

### Fase 2 — Módulo Vendor

**Tarea 2.1 al 2.9** — Mismo patrón que Brand, adaptado para Vendor:
- Modelo `MtVendor`
- Servicio `VendorModuleService`
- Identificador `VENDOR_MODULE = "vendor"`
- Migración: `npm run db:generate -- vendor`
- Tabla resultado: `mt_vendor`
- Verificar que `handle` y `email` generan índices únicos correctamente

---

### Fase 3 — Módulo ShippingRules

**Tarea 3.1 al 3.9** — Mismo patrón:
- Modelo `MtShippingRule`
- Servicio `ShippingRulesModuleService`
- Identificador `SHIPPING_RULES_MODULE = "shipping-rules"`
- Migración: `npm run db:generate -- shipping-rules`
- Tabla resultado: `mt_shipping_rule`
- Solo rutas admin (no store — las reglas son internas)

---

### Fase 4 — Link Modules

**Tarea 4.1 — Implementar product-brand**
- Crear `src/links/product-brand.ts`
- Usar `defineLink(ProductModule.linkable.product, BrandModule.linkable.mtBrand)`
- Reiniciar servidor y verificar que el link se carga en consola

**Tarea 4.2 — Implementar product-vendor**
- Crear `src/links/product-vendor.ts`
- Usar `defineLink(ProductModule.linkable.product, VendorModule.linkable.mtVendor)`

**Tarea 4.3 — Migrar link modules**
```bash
npm run db:migrate
```
- Los links generan sus propias tablas de join gestionadas por Medusa
- Verificar tablas `product_brand` y `product_vendor` creadas

**Tarea 4.4 — Verificar queries con links**
- Asignar una marca a un producto via el container de Medusa
- Recuperar el producto con su marca via query con `relations`
- Confirmar que el link funciona en ambas direcciones

---

### Fase 5 — Validación del Sprint 2

**Tarea 5.1 — Smoke test completo**

```bash
# Crear marca
POST /admin/brands
{ "name": "Nike", "handle": "nike", "is_active": true }

# Crear vendedor
POST /admin/vendors
{ "name": "Tienda Demo", "handle": "tienda-demo", "email": "demo@test.com" }

# Crear regla de envío
POST /admin/shipping-rules
{ "name": "Envío gratis +Q200", "min_order_amount": 20000, "is_free": true }

# Verificar store
GET /store/brands (con x-publishable-api-key)
GET /store/vendors (con x-publishable-api-key)
```

**Criterio de aceptación:**
- Los tres módulos cargan sin errores al iniciar el servidor.
- Las migraciones crean `mt_brand`, `mt_vendor`, `mt_shipping_rule` en PostgreSQL.
- Los links `product_brand` y `product_vendor` existen en la base de datos.
- Las rutas admin y store responden correctamente.
- Un producto puede tener marca y vendedor asignados via los link modules.

---

## Orden de Implementación Recomendado

```
Brand → Vendor → ShippingRules → Links → Validación
```

Razones:
1. Brand es el módulo más simple y sirve para aprender el patrón.
2. Vendor sigue el mismo patrón — al implementarlo ya se conoce el flujo.
3. ShippingRules es independiente de los otros dos.
4. Los links dependen de que Brand y Vendor estén completos y migrados.
5. La validación final requiere todos los componentes operativos.

Implementar un módulo completo (modelo + servicio + migración + rutas + test) antes de pasar al siguiente.

---

## Comandos de Referencia para el Sprint

```bash
# Generar migración para un módulo (ejecutar desde backend/)
npm run db:generate -- brand
npm run db:generate -- vendor
npm run db:generate -- shipping-rules

# Aplicar todas las migraciones pendientes
npm run db:migrate

# Verificar tablas creadas en PostgreSQL
psql postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev -c '\dt mt_*'

# Servidor de desarrollo
npm run dev
```

---

## Riesgos Técnicos del Sprint 2

### Riesgo 1 — Nomenclatura del linkable en defineLink
**Nivel:** Medio
**Descripción:** El nombre de la propiedad `linkable.mtBrand` es auto-generado por `MedusaService` basándose en el nombre de la entidad. Si el nombre generado difiere del esperado (por ejemplo, `mtBrand` vs `mt_brand` vs `brand`), el link fallará en runtime con un error difícil de diagnosticar.
**Mitigación:** Antes de implementar los links, verificar en consola qué propiedades expone `BrandModule.linkable` con un log o inspección en el servidor de desarrollo.

### Riesgo 2 — Módulo identifier case sensitivity
**Nivel:** Medio
**Descripción:** El identificador del módulo (`BRAND_MODULE = "brand"`) debe coincidir exactamente con el valor usado en `medusa-config.ts` y en las referencias de los link modules. Una discrepancia causa un error silencioso donde el módulo no se encuentra.
**Mitigación:** Definir el identificador como constante exportada desde `index.ts` y usarlo en todos los archivos que lo referencian. Nunca escribir el string literal dos veces.

### Riesgo 3 — Colisión de nombres en migraciones
**Nivel:** Bajo
**Descripción:** `npm run db:generate -- brand` requiere que el nombre del módulo sea reconocido por Medusa. Si el identificador del módulo no coincide con el argumento del comando, la migración se genera vacía o no se genera.
**Mitigación:** El argumento de `db:generate` debe ser el identificador exacto del módulo como está registrado en `medusa-config.ts`.

### Riesgo 4 — Importación de módulos nativos para defineLink
**Nivel:** Medio
**Descripción:** La importación `import ProductModule from "@medusajs/medusa/product"` usa un subpath export del paquete `@medusajs/medusa`. Si la resolución de módulos falla (recordar el problema anterior con `moduleResolution`), el link no compila.
**Mitigación:** Verificar que `tsconfig.json` tenga `"moduleResolution": "Bundler"` (ya corregido en Sprint 1). Si el import falla, usar la alternativa: `import { Modules } from "@medusajs/framework/utils"` y construir la referencia del link con el string `Modules.PRODUCT`.

### Riesgo 5 — Servidor que no reinicia entre cambios de módulos
**Nivel:** Bajo
**Descripción:** En desarrollo, `npm run dev` tiene hot reload pero los cambios en `medusa-config.ts` (registro de módulos) y en link modules pueden requerir reinicio completo del servidor para surtir efecto.
**Mitigación:** Después de cada cambio en `medusa-config.ts` o en `src/links/`, reiniciar el servidor manualmente con Ctrl+C y `npm run dev`.

---

## Notas

- La asociación entre `MtVendor` y el `Customer` nativo de Medusa se implementa en el Sprint 3 cuando se diseñen los roles del marketplace.
- Las extensiones `wholesale_price` y `weight` del modelo Product se implementan en Sprint 3 como una entidad de extensión separada con link a Product.
- Los campos `metadata` en todos los modelos son la vía para agregar datos no estructurados sin crear nuevas migraciones.

---

## Nota para Sprint 4 — Mayoreo (Descuento por Cantidad)

El requisito de "Mayoreo" (agregar 3+ unidades del mismo producto al carrito activa un descuento) es el entregable **"Descuento por cantidad"** del Sprint 4. No requiere módulo separado.

Medusa v2 tiene soporte nativo para esto en su módulo de promociones:
- `PromotionType.BUYGET` — tipo "compra X unidades de un producto"
- `PromotionRuleOperator.GTE` — condición `cantidad >= 3`
- `ApplicationMethodType.PERCENTAGE` — descuento porcentual
- `ApplicationMethodAllocation.EACH` — aplica a cada ítem calificado
- `buy_rules_min_quantity` — campo nativo para la cantidad mínima disparadora
- `apply_to_quantity` — campo nativo para cuántos ítems reciben el descuento

**Acción obligatoria al inicio del Sprint 4:** antes de construir código propio en el módulo `promotion-engine`, probar si la promoción nativa `BUYGET` puede aplicar el descuento sobre los *mismos* ítems que disparan la regla (comprar 3 de producto A → descuento sobre esos 3 de A). Si la promoción nativa lo soporta, "Mayoreo" es solo configuración. Si no lo soporta en ese caso, se extiende con el módulo `promotion-engine` ya planificado.
