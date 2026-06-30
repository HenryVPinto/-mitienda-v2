# Sprint 4 — Motor de Promociones y Vínculo Vendor-Customer

Versión: 1.0
Fecha: 2026-06-06
Basado en: BACKEND_PLAN.md, ROADMAP.md, SPRINT3_PLAN.md
Prerequisito: Sprint 3 completado y validado

---

## Objetivo

Construir el motor comercial de MiTienda implementando promociones avanzadas que van más allá del módulo nativo de Medusa: combos, regalos automáticos, descuentos por cantidad y precios mayoristas. Además, vincular vendors con clientes para habilitar el rol de vendedor auto-registrado.

Al finalizar este sprint:
- Un administrador puede crear reglas de promoción personalizadas (combos, regalos, mayoreo).
- El API puede evaluar si un carrito califica para una o más promociones.
- El módulo nativo de Medusa se usa para descuentos estándar y códigos de descuento.
- Un vendor puede tener un customer de Medusa asociado (base para auto-registro en Sprint futuro).
- El dashboard tiene una página de gestión de reglas de promoción.

---

## Alcance

| Entregable | Prioridad | Descripción |
|---|---|---|
| Investigación de promociones nativas | Alta | Verificar hasta dónde llega el módulo nativo antes de construir nada propio |
| Módulo `promotion-engine` | Alta | Reglas avanzadas: COMBO, GIFT, QUANTITY_DISCOUNT, WHOLESALE |
| Link `product ↔ promotion-rule` | Alta | Vincular productos a reglas de promoción |
| Link `vendor ↔ customer` | Alta | Rol de vendedor con cuenta de cliente en Medusa |
| API de evaluación de promociones | Alta | `POST /store/promotions/evaluate` — evalúa un carrito contra reglas activas |
| API CRUD de reglas | Alta | `GET/POST /admin/promotion-rules`, `GET/PATCH/DELETE /admin/promotion-rules/:id` |
| Admin UI: página de Promociones | Media | Lista y formulario de creación/edición de reglas |
| Admin UI: widget de promociones en producto | Media | Muestra qué reglas aplican a ese producto |

**Fuera de alcance en este sprint:**
- Aplicación automática de regalos en el carrito (requiere workflow personalizado, Sprint 6)
- Integración con el checkout nativo para aplicar los descuentos del motor propio (Sprint 6)
- Frontend de promociones (Sprint 6)
- Módulo CMS (Sprint 5)

---

## Contexto Técnico

### Capacidades del módulo nativo de Medusa v2

Medusa incluye un módulo `@medusajs/promotion` con soporte para:

| Tipo | Lo que puede | Limitación |
|---|---|---|
| `STANDARD` | Códigos de descuento, % o monto fijo, por producto/categoría/carrito | No evalúa cantidad de unidades del mismo producto |
| `BUYGET` | Compra X unidades → recibe descuento en Y unidades | El target de Y debe ser diferente al trigger, o bien toda la orden |

**Conclusión de la investigación previa al sprint:**
- Descuentos simples por código: usar módulo nativo directamente.
- Compra 3 del mismo producto → descuento en esos 3 (mayoreo): el nativo no cubre exactamente este caso → `promotion-engine`.
- Combos (compra A + B → precio especial): no cubierto nativamente → `promotion-engine`.
- Regalos automáticos (compra A → lleva B gratis): no cubierto nativamente → `promotion-engine`.
- Descuento por cantidad escalonado (3 uds → 10%, 6 uds → 20%): no cubierto nativamente → `promotion-engine`.

### Estrategia de evaluación

El `promotion-engine` no modifica el carrito directamente. En cambio, expone un endpoint de evaluación que el frontend (Sprint 6) puede llamar para mostrar al usuario qué descuentos aplican antes de hacer checkout. La aplicación real del descuento en el precio se delega a un workflow de Medusa en Sprint 6.

---

## Módulo `promotion-engine`

### Propósito

Almacenar reglas de promoción avanzadas que no existen en el módulo nativo de Medusa.

### Modelo — `MtPromoRule`

| Campo | Tipo DML | Requerido | Default | Descripción |
|---|---|---|---|---|
| `id` | `model.id({ prefix: "mtpro" })` | Sí | Auto | PK con prefijo `mtpro_` |
| `name` | `model.text()` | Sí | — | Nombre descriptivo |
| `type` | `model.enum(["COMBO","GIFT","QUANTITY_DISCOUNT","WHOLESALE"])` | Sí | — | Tipo de regla |
| `description` | `model.text().nullable()` | No | null | Descripción pública |
| `is_active` | `model.boolean()` | Sí | true | Activa o inactiva |
| `starts_at` | `model.dateTime().nullable()` | No | null | Inicio de vigencia |
| `ends_at` | `model.dateTime().nullable()` | No | null | Fin de vigencia |
| `min_quantity` | `model.number().nullable()` | No | null | Cantidad mínima para activar (QUANTITY_DISCOUNT, WHOLESALE) |
| `discount_percentage` | `model.number().nullable()` | No | null | % de descuento a aplicar (0-100) |
| `discount_amount` | `model.number().nullable()` | No | null | Monto fijo de descuento en centavos (GTQ × 100) |
| `gift_product_id` | `model.text().nullable()` | No | null | ID de producto Medusa a regalar (GIFT) |
| `gift_quantity` | `model.number().nullable()` | No | null | Cantidad del regalo (GIFT) |
| `metadata` | `model.json().nullable()` | No | null | Datos extendidos |

**Tabla generada:** `mt_promo_rule`

### Tipos de regla

| Tipo | Lógica | Campos usados |
|---|---|---|
| `QUANTITY_DISCOUNT` | Compra N o más unidades del mismo producto → % de descuento | `min_quantity`, `discount_percentage` |
| `WHOLESALE` | Usa `wholesale_price` del producto si se compran N o más unidades | `min_quantity` |
| `COMBO` | Compra los productos vinculados juntos → % de descuento | `discount_percentage` (productos via link) |
| `GIFT` | Compra cualquiera de los productos vinculados → recibe `gift_product_id` gratis | `gift_product_id`, `gift_quantity` |

### API Routes

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/promotion-rules` | Listar reglas con filtros opcionales |
| `POST` | `/admin/promotion-rules` | Crear nueva regla |
| `GET` | `/admin/promotion-rules/:id` | Obtener regla por ID |
| `PATCH` | `/admin/promotion-rules/:id` | Actualizar regla |
| `DELETE` | `/admin/promotion-rules/:id` | Eliminar regla |
| `POST` | `/admin/promotion-rules/:id/products` | Vincular productos a la regla |
| `DELETE` | `/admin/promotion-rules/:id/products/:product_id` | Desvincular producto |
| `POST` | `/store/promotions/evaluate` | Evaluar carrito contra reglas activas |

---

## Link `product ↔ promotion-rule`

**Archivo:** `src/links/product-promotion-rule.ts`

```typescript
import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import PromotionEngineModule from "../modules/promotion-engine"

export default defineLink(
  ProductModule.linkable.product,
  PromotionEngineModule.linkable.mtPromoRule
)
```

Este link es 1:N — un producto puede participar en múltiples reglas, y una regla (COMBO, GIFT) puede vincular múltiples productos.

---

## Link `vendor ↔ customer`

**Archivo:** `src/links/vendor-customer.ts`

```typescript
import { defineLink } from "@medusajs/framework/utils"
import CustomerModule from "@medusajs/medusa/customer"
import VendorModule from "../modules/vendor"

export default defineLink(
  VendorModule.linkable.mtVendor,
  CustomerModule.linkable.customer,
  { isList: false }
)
```

**Propósito:** Un vendor puede tener una cuenta de cliente de Medusa asociada. Esto permite que un vendedor auto-registrado haga pedidos en nombre propio en el futuro.

### API Routes de `vendor ↔ customer`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/admin/vendors/:id/customer` | Obtener el customer vinculado al vendor |
| `POST` | `/admin/vendors/:id/customer` | Vincular customer al vendor |
| `DELETE` | `/admin/vendors/:id/customer` | Desvincular customer |

---

## Endpoint de Evaluación de Promociones

**Archivo:** `src/api/store/promotions/evaluate/route.ts`

`POST /store/promotions/evaluate`

**Body:**
```json
{
  "items": [
    { "product_id": "prod_01...", "quantity": 3, "unit_price": 25000 },
    { "product_id": "prod_02...", "quantity": 1, "unit_price": 15000 }
  ]
}
```

**Response:**
```json
{
  "applicable_promotions": [
    {
      "rule_id": "mtpro_01...",
      "rule_name": "Descuento mayoreo 3+ unidades",
      "type": "QUANTITY_DISCOUNT",
      "applied_to": ["prod_01..."],
      "discount_percentage": 10,
      "savings": 7500
    }
  ],
  "total_savings": 7500
}
```

La lógica de evaluación:
1. Carga todas las reglas activas y vigentes.
2. Para cada item del carrito, busca reglas vinculadas a ese producto.
3. Evalúa si el item cumple la condición (min_quantity, combo completo, etc.).
4. Devuelve las reglas aplicables con el ahorro calculado.

---

## Admin UI — Página de Promociones

**Archivo:** `src/admin/routes/promotions/page.tsx`

- Listado de todas las reglas de `promotion-engine` con tipo, estado y vigencia.
- Formulario de creación: seleccionar tipo → aparecen los campos relevantes para ese tipo.
- Edición inline por fila.
- Vincular/desvincular productos a una regla desde la misma página.

---

## Admin UI — Widget de Promociones en Producto

**Archivo:** `src/admin/widgets/product-promotions-widget.tsx`

- Zona: `product.details.side.before` (debajo del widget de vendor).
- Muestra lista de reglas activas vinculadas al producto.
- Botón para vincular a una regla existente.

---

## Roadmap Técnico Detallado

### Fase 1 — Módulo `promotion-engine`

**Tarea 1.1 — Crear el modelo**
- Crear `src/modules/promotion-engine/models/promo-rule.ts`
- Definir `MtPromoRule` con todos los campos de la tabla

**Tarea 1.2 — Crear el servicio**
- Crear `src/modules/promotion-engine/service.ts`
- `MedusaService({ MtPromoRule })`

**Tarea 1.3 — Crear tipos**
- Crear `src/modules/promotion-engine/types/index.ts`
- `CreatePromoRuleInput`, `UpdatePromoRuleInput`, `PromoRuleType` (enum)

**Tarea 1.4 — Crear index del módulo**
- Crear `src/modules/promotion-engine/index.ts`
- Exportar `PROMOTION_ENGINE_MODULE = "promotion_engine"`

**Tarea 1.5 — Registrar en medusa-config.ts**
- Agregar `resolve: "./src/modules/promotion-engine"`

**Tarea 1.6 — Crear link product ↔ promotion-rule**
- Crear `src/links/product-promotion-rule.ts`

**Tarea 1.7 — Generar migración y migrar**
```bash
npm run db:generate -- promotion_engine
npm run db:migrate
```

**Tarea 1.8 — Crear API routes de admin**
- Crear `src/api/admin/promotion-rules/route.ts` (GET list + POST create)
- Crear `src/api/admin/promotion-rules/[id]/route.ts` (GET + PATCH + DELETE)
- Crear `src/api/admin/promotion-rules/[id]/products/route.ts` (POST vincular)
- Crear `src/api/admin/promotion-rules/[id]/products/[product_id]/route.ts` (DELETE desvincular)

**Tarea 1.9 — Smoke test CRUD**
- Crear una regla `QUANTITY_DISCOUNT`
- Vincular un producto
- Verificar con GET

---

### Fase 2 — Endpoint de evaluación store

**Tarea 2.1 — Crear el endpoint**
- Crear `src/api/store/promotions/evaluate/route.ts`
- Lógica de evaluación para `QUANTITY_DISCOUNT` y `WHOLESALE`

**Tarea 2.2 — Lógica de evaluación para COMBO**
- Un COMBO aplica solo si TODOS los productos del combo están en el carrito
- Calcular el descuento sobre el subtotal de los productos del combo

**Tarea 2.3 — Lógica de evaluación para GIFT**
- Un GIFT aplica si cualquier producto del link está en el carrito
- El response indica qué producto regalo debe agregarse

**Tarea 2.4 — Actualizar middlewares.ts**
- Agregar auth para `/admin/promotion-rules*`
- El endpoint `/store/promotions/evaluate` es público (no requiere auth)

**Tarea 2.5 — Smoke test de evaluación**
```bash
# Crear regla QUANTITY_DISCOUNT: compra 3+ → 10% off
POST /admin/promotion-rules
{ "name": "Mayoreo 3+", "type": "QUANTITY_DISCOUNT", "min_quantity": 3, "discount_percentage": 10 }

# Vincular producto
POST /admin/promotion-rules/:id/products
{ "product_id": "prod_01..." }

# Evaluar carrito con 3 unidades de ese producto
POST /store/promotions/evaluate
{ "items": [{ "product_id": "prod_01...", "quantity": 3, "unit_price": 25000 }] }
# → debe devolver la regla aplicada y savings: 7500
```

---

### Fase 3 — Link `vendor ↔ customer`

**Tarea 3.1 — Crear el link**
- Crear `src/links/vendor-customer.ts`

**Tarea 3.2 — Migrar**
```bash
npm run db:migrate
```

**Tarea 3.3 — Crear API routes**
- Crear `src/api/admin/vendors/[id]/customer/route.ts` (GET + POST + DELETE)
- Actualizar `middlewares.ts`: el matcher `/admin/vendors*` ya cubre estas rutas

**Tarea 3.4 — Smoke test**
- Obtener un customer ID del dashboard
- Vincular a un vendor: `POST /admin/vendors/:id/customer`
- Verificar: `GET /admin/vendors/:id/customer`

---

### Fase 4 — Admin UI

**Tarea 4.1 — Página de Promociones**
- Crear `src/admin/routes/promotions/page.tsx`
- Lista de reglas con columnas: nombre, tipo, estado, vigencia, productos vinculados
- Formulario de creación con campos condicionales por tipo
- Edición inline

**Tarea 4.2 — Widget de Promociones en Producto**
- Crear `src/admin/widgets/product-promotions-widget.tsx`
- Zona: `product.details.side.before`
- Mostrar reglas activas vinculadas
- Botón para vincular a una regla existente

**Tarea 4.3 — Verificar en dashboard**
- Abrir `/app/promotions` → confirmar que la página aparece en el sidebar
- Crear regla desde UI → verificar que se guarda
- Abrir un producto → confirmar widget de promociones en sidebar

---

### Fase 5 — Validación del Sprint 4

**Tarea 5.1 — Smoke test de base de datos**
```sql
\dt mt_promo_rule
-- Verificar tablas de links
\dt | grep -E "promo|vendor.*customer"
```

**Tarea 5.2 — Smoke test completo**
```bash
# QUANTITY_DISCOUNT
POST /admin/promotion-rules  → crear regla
POST /admin/promotion-rules/:id/products  → vincular producto
POST /store/promotions/evaluate  → verificar ahorro calculado

# GIFT
POST /admin/promotion-rules  → crear regla tipo GIFT
POST /store/promotions/evaluate  → verificar que devuelve gift_product_id

# Vendor ↔ Customer
POST /admin/vendors/:id/customer  → vincular
GET  /admin/vendors/:id/customer  → verificar
```

**Tarea 5.3 — Smoke test de UI**
- Crear regla QUANTITY_DISCOUNT desde la página de Promociones
- Vincular un producto a la regla desde el widget del producto
- Verificar que el widget del producto muestra la regla vinculada

**Criterio de aceptación:**
- La tabla `mt_promo_rule` existe y acepta datos de todos los tipos.
- `POST /store/promotions/evaluate` devuelve promociones aplicables con ahorro calculado.
- El link `vendor ↔ customer` funciona y tiene API.
- La página de Promociones permite crear y editar reglas desde el dashboard.
- El widget de producto muestra las reglas activas del producto.

---

## Orden de Implementación Recomendado

```
promotion-engine (módulo + migración)
→ link product ↔ promotion-rule (migrar)
→ link vendor ↔ customer (migrar)
→ API CRUD de admin (promotion-rules)
→ API routes vendor ↔ customer
→ Endpoint evaluate (store)
→ Admin UI página de Promociones
→ Widget de producto
→ Validación completa
```

Las fases 1 (módulo) y 3 (vendor-customer link) son independientes y pueden implementarse en paralelo. La fase 2 (evaluate) depende de que las migraciones de la fase 1 estén completas.

---

## Comandos de Referencia para el Sprint

```bash
# Desde /Users/admin/Documents/mitienda-v2/backend

# Generar migración para promotion-engine
npm run db:generate -- promotion_engine

# Aplicar migraciones (también migra los nuevos links)
npm run db:migrate

# Verificar tablas propias
psql $DATABASE_URL -c '\dt mt_*'

# Verificar tablas de links nuevos
psql $DATABASE_URL -c '\dt' | grep -E 'promo|vendor.*customer'

# Servidor de desarrollo
npm run dev
```

---

## Riesgos Técnicos del Sprint 4

### Riesgo 1 — Lógica de evaluación de COMBO con múltiples productos
**Nivel:** Medio
**Descripción:** Para que un COMBO aplique, todos sus productos deben estar en el carrito. La lógica de evaluación necesita cruzar los `product_ids` del link con los `product_ids` del carrito. Si un producto del COMBO tiene múltiples variantes, la evaluación debe considerar si cualquier variante del producto cuenta.
**Mitigación:** En la primera versión, evaluar por `product_id` exacto, sin considerar variantes. Documentar esta limitación claramente. En Sprint 6 se puede refinar si el frontend lo necesita.

### Riesgo 2 — Campo `gift_product_id` sin validación de existencia
**Nivel:** Bajo
**Descripción:** El campo `gift_product_id` en `MtPromoRule` es un texto libre que referencia un producto de Medusa. Si el producto es eliminado, la regla queda con un ID inválido.
**Mitigación:** Al crear/actualizar una regla GIFT, validar que el `gift_product_id` existe via el servicio de productos de Medusa antes de guardar. Agregar esta validación en el POST del admin route.

### Riesgo 3 — Overlap entre reglas — ¿se acumulan los descuentos?
**Nivel:** Medio
**Descripción:** Si un producto tiene múltiples reglas activas que aplican simultáneamente, el frontend necesita saber si los descuentos se acumulan o si solo aplica el mayor.
**Mitigación:** Definir desde el inicio la política: **no acumulación** — si múltiples reglas aplican al mismo producto, se usa la de mayor ahorro. Documentarlo en el response de `/evaluate` con un campo `policy: "best_applies"`.

### Riesgo 4 — Sincronización con el módulo nativo de promociones
**Nivel:** Bajo
**Descripción:** El dashboard de Medusa ya tiene una sección de "Promociones" para los descuentos nativos. La nueva página de `/app/promotions` del `promotion-engine` es diferente y podría confundir al administrador.
**Mitigación:** Nombrar la ruta del sidebar como "Reglas de Precio" en lugar de "Promociones" para diferenciarla claramente de la sección nativa de Medusa.

---

## Notas para Sprints Siguientes

- **Sprint 5 (CMS):** Módulo `cms` con `MtBanner`, `MtFaq` y `MtPolicy`. Los banners del home pueden estar vinculados a marcas (usando `logo_url` y `mt_brand`).
- **Sprint 6 (Frontend):** El frontend llama a `POST /store/promotions/evaluate` al actualizar el carrito para mostrar ahorros en tiempo real. La aplicación real del descuento se implementa en un Medusa Workflow que modifica el precio del line item.
- **Sprint 6 (Vendor auto-registro):** El link `vendor ↔ customer` habilitado en este sprint se usa en Sprint 6 para permitir que un emprendedor cree su cuenta pública y gestione su perfil de vendedor.
