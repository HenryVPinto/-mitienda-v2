# Plan de Backend — MiTienda 2.0

Versión: 1.0
Fecha: 2026-06-05
Sprint objetivo: Sprint 1 — Core Ecommerce

---

## 1. Estructura de Carpetas

La estructura sigue las convenciones de MedusaJS v2 y separa claramente el núcleo del framework de las personalizaciones propias.

```
mitienda-backend/
├── src/
│   ├── admin/                        # Extensiones del panel administrativo
│   │   └── routes/                   # Rutas personalizadas en el dashboard
│   │       ├── brands/               # UI de gestión de marcas
│   │       ├── vendors/              # UI de gestión de vendedores
│   │       └── cms/                  # UI de gestión de contenido
│   │
│   ├── api/                          # Endpoints HTTP personalizados
│   │   ├── middlewares.ts            # Middlewares globales del proyecto
│   │   ├── store/                    # Endpoints públicos (storefront)
│   │   │   ├── brands/
│   │   │   ├── vendors/
│   │   │   └── cms/
│   │   └── admin/                    # Endpoints privados (admin)
│   │       ├── brands/
│   │       ├── vendors/
│   │       └── cms/
│   │
│   ├── jobs/                         # Tareas programadas
│   │   └── (reservado para fases futuras)
│   │
│   ├── links/                        # Vínculos entre módulos (cross-module)
│   │   ├── product-brand.ts          # Product ↔ Brand
│   │   ├── product-vendor.ts         # Product ↔ Vendor
│   │   └── order-vendor.ts           # Order ↔ Vendor
│   │
│   ├── modules/                      # Módulos personalizados de MiTienda
│   │   ├── brand/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   ├── models/
│   │   │   │   └── brand.ts
│   │   │   ├── migrations/
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── vendor/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   ├── models/
│   │   │   │   └── vendor.ts
│   │   │   ├── migrations/
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── cms/
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   ├── models/
│   │   │   │   ├── banner.ts
│   │   │   │   ├── faq.ts
│   │   │   │   └── policy.ts
│   │   │   ├── migrations/
│   │   │   └── types/
│   │   │       └── index.ts
│   │   │
│   │   ├── promotion-engine/         # Promociones avanzadas (Sprint 4)
│   │   │   ├── index.ts
│   │   │   ├── service.ts
│   │   │   ├── models/
│   │   │   ├── migrations/
│   │   │   └── types/
│   │   │
│   │   └── shipping-rules/           # Reglas de envío (Sprint 2)
│   │       ├── index.ts
│   │       ├── service.ts
│   │       ├── models/
│   │       │   └── shipping-rule.ts
│   │       ├── migrations/
│   │       └── types/
│   │
│   ├── subscribers/                  # Suscriptores de eventos
│   │   └── (reservado para notificaciones futuras)
│   │
│   └── workflows/                    # Workflows de negocio personalizados
│       └── (reservado para Sprint 4+)
│
├── .env                              # Variables de entorno (no versionar)
├── .env.example                      # Plantilla de variables de entorno
├── medusa-config.ts                  # Configuración principal de Medusa
├── package.json
└── tsconfig.json
```

---

## 2. Estrategia de Módulos Personalizados

### Principio base

Ningún módulo personalizado modifica el núcleo de MedusaJS. Toda extensión ocurre mediante el sistema de módulos propio del framework.

### Ciclo de vida de un módulo

Cada módulo personalizado sigue este patrón:

1. **Model** — Define la entidad usando el modelo de datos de Medusa v2.
2. **Service** — Extiende `MedusaService` con la lógica de negocio.
3. **Migration** — Generada automáticamente, versionada con el código.
4. **index.ts** — Exporta la definición del módulo para `medusa-config.ts`.
5. **types/index.ts** — Tipos TypeScript del módulo (interfaces, DTOs).
6. **API route** — Endpoint HTTP que expone el módulo al exterior.
7. **Link** (si aplica) — Vínculo con entidades de otros módulos.

### Módulos del Sprint 1

El Sprint 1 utiliza únicamente los módulos nativos de MedusaJS:

| Módulo nativo | Funcionalidad |
|---|---|
| `@medusajs/product` | Productos, variantes, categorías |
| `@medusajs/inventory` | Inventario y stock |
| `@medusajs/customer` | Clientes y grupos |
| `@medusajs/cart` | Carrito de compra |
| `@medusajs/order` | Órdenes y fulfillment |
| `@medusajs/payment` | Procesamiento de pagos |
| `@medusajs/fulfillment` | Envíos y fulfillment |
| `@medusajs/auth` | Autenticación |
| `@medusajs/user` | Gestión de usuarios administrativos |

No se desarrolla ningún módulo personalizado durante el Sprint 1. La arquitectura de carpetas se prepara para recibirlos en Sprints posteriores.

### Módulos del Sprint 2 en adelante

| Módulo propio | Sprint | Prioridad |
|---|---|---|
| `brand` | Sprint 2 | Alta |
| `vendor` | Sprint 2–3 | Alta |
| `shipping-rules` | Sprint 2 | Media |
| `promotion-engine` | Sprint 4 | Alta |
| `cms` | Sprint 5 | Media |

### Estrategia de vínculos entre módulos (Links)

MedusaJS v2 conecta entidades de distintos módulos mediante **link modules** en `src/links/`. Esto evita acoplamiento directo entre módulos y preserva la independencia de cada uno.

Vínculos planificados:

- `product-brand.ts` — Asocia un `Product` (módulo nativo) con un `Brand` (módulo propio).
- `product-vendor.ts` — Asocia un `Product` con un `Vendor`.
- `order-vendor.ts` — Asocia una `Order` con un `Vendor` para trazabilidad del marketplace.

Estos vínculos se implementan a partir del Sprint 2.

---

## 3. Estrategia PostgreSQL

### Configuración de base de datos

Se utilizará una única instancia de PostgreSQL para el proyecto. MedusaJS v2 gestiona sus propias tablas mediante MikroORM. Los módulos personalizados generan sus propias migraciones dentro de sus carpetas respectivas.

### Esquema de nomenclatura

| Tipo | Convención | Ejemplo |
|---|---|---|
| Tablas nativas Medusa | `snake_case` gestionado por el framework | `product`, `order`, `customer` |
| Tablas módulos propios | `mt_` + `snake_case` | `mt_brand`, `mt_vendor`, `mt_banner` |
| Columnas | `snake_case` | `created_at`, `brand_id` |
| Índices | `idx_` + tabla + columna | `idx_mt_brand_handle` |
| Claves foráneas | `fk_` + tabla_origen + tabla_destino | `fk_mt_vendor_customer` |

El prefijo `mt_` en tablas propias evita colisiones con tablas presentes o futuras del núcleo de Medusa.

### Extensiones de Product (Sprint 2)

Las extensiones al modelo `Product` nativo no modifican la tabla `product` del framework. Se implementan como entidades separadas vinculadas mediante link modules:

- `brand_id` — via `product-brand` link
- `vendor_id` — via `product-vendor` link
- `wholesale_price` — columna adicional en tabla de extensión propia
- `weight` — columna adicional en tabla de extensión propia

### Gestión de migraciones

- Cada módulo propio mantiene sus migraciones en `src/modules/{nombre}/migrations/`.
- Las migraciones se versionan junto con el código fuente.
- Las migraciones se ejecutan con el CLI de Medusa: `medusa db:migrate`.
- Nunca se modifican migraciones ya ejecutadas en producción.
- Los cambios a esquemas existentes siempre generan una nueva migración.

### Variables de entorno (base de datos)

```
DATABASE_URL=postgres://usuario:contraseña@localhost:5432/mitienda_dev
```

Se manejan entornos separados:

| Entorno | Base de datos |
|---|---|
| Desarrollo | `mitienda_dev` |
| Testing | `mitienda_test` |
| Producción | `mitienda_prod` |

---

## 4. Roadmap Técnico — Sprint 1

### Objetivo

Levantar MedusaJS v2 con PostgreSQL y verificar que todos los módulos nativos de ecommerce funcionan correctamente.

### Fase 1 — Inicialización del proyecto

**Tarea 1.1 — Crear proyecto MedusaJS**

- Ejecutar el comando de scaffolding oficial de Medusa v2.
- Verificar estructura de carpetas generada.
- Confirmar versión de Node.js compatible (Node 20 LTS recomendado).

**Tarea 1.2 — Configurar PostgreSQL**

- Crear base de datos `mitienda_dev`.
- Crear usuario de base de datos con permisos restringidos.
- Configurar `DATABASE_URL` en `.env`.
- Verificar conexión desde el proyecto.

**Tarea 1.3 — Ejecutar migraciones iniciales**

- Ejecutar `medusa db:migrate` para crear el esquema base de Medusa.
- Verificar que las tablas del framework se crean correctamente.
- Verificar que no existen errores de permisos o conexión.

**Tarea 1.4 — Crear usuario administrador**

- Ejecutar el comando de seed oficial para crear el primer usuario admin.
- Verificar acceso al panel administrativo en `localhost:9000/app`.

---

### Fase 2 — Verificación de módulos nativos

**Tarea 2.1 — Productos y categorías**

- Crear una categoría de prueba desde el panel.
- Crear un producto de prueba con variantes.
- Verificar disponibilidad del producto via API Store: `GET /store/products`.
- Verificar disponibilidad via API Admin: `GET /admin/products`.

**Tarea 2.2 — Inventario**

- Asignar stock a la variante creada.
- Verificar que el inventario se refleja en la respuesta de la API.

**Tarea 2.3 — Clientes**

- Crear un cliente de prueba desde el panel.
- Verificar endpoint: `GET /admin/customers`.

**Tarea 2.4 — Carrito y Checkout**

- Crear un carrito via API: `POST /store/carts`.
- Agregar un ítem al carrito.
- Completar el flujo de checkout hasta la creación de la orden.

**Tarea 2.5 — Órdenes**

- Verificar que la orden creada en 2.4 aparece en el panel.
- Verificar endpoint: `GET /admin/orders`.

---

### Fase 3 — Configuración del proyecto

**Tarea 3.1 — Estructura de carpetas personalizada**

- Crear la estructura de directorios definida en la sección 1.
- Crear archivos `.gitkeep` en carpetas vacías para preservarlas en git.
- Crear `.env.example` con todas las variables necesarias documentadas.

**Tarea 3.2 — Configuración de medusa-config.ts**

- Revisar y documentar la configuración generada.
- Verificar que los módulos nativos están correctamente registrados.
- Preparar secciones comentadas para los módulos personalizados futuros.

**Tarea 3.3 — Control de versiones**

- Inicializar repositorio git.
- Configurar `.gitignore` (excluir `.env`, `node_modules`, `dist`).
- Realizar commit inicial con la estructura base.

---

### Fase 4 — Validación y documentación

**Tarea 4.1 — Smoke test del API**

- Ejecutar pruebas manuales de los endpoints principales con un cliente HTTP.
- Verificar que la autenticación JWT funciona para endpoints de admin.
- Verificar que los endpoints de store son accesibles sin autenticación.

**Tarea 4.2 — Documentación del entorno**

- Documentar el proceso de instalación local en el README del proyecto.
- Documentar las variables de entorno requeridas.
- Documentar los comandos frecuentes (dev, migrate, seed).

**Criterio de aceptación del Sprint 1:**
El backend de ecommerce responde correctamente a los endpoints de productos, clientes, carrito, checkout y órdenes. El panel administrativo es accesible y funcional.

---

## 5. Dependencias

### Dependencias de producción

| Paquete | Versión | Propósito |
|---|---|---|
| `@medusajs/medusa` | `^2.x` | Framework core |
| `@medusajs/admin-sdk` | `^2.x` | SDK para extensiones del panel admin |
| `@medusajs/framework` | `^2.x` | Utilidades del framework |
| `pg` | `^8.x` | Driver de PostgreSQL |

### Dependencias de desarrollo

| Paquete | Versión | Propósito |
|---|---|---|
| `typescript` | `^5.x` | Tipado estático |
| `@types/node` | `^20.x` | Tipos de Node.js |
| `ts-node` | `^10.x` | Ejecución de TypeScript en desarrollo |

### Requisitos de entorno

| Herramienta | Versión mínima | Notas |
|---|---|---|
| Node.js | 20 LTS | Versión recomendada por Medusa v2 |
| npm | 9+ | O yarn/pnpm equivalente |
| PostgreSQL | 15+ | Versión recomendada |
| Git | 2.x | Control de versiones |

### Dependencias diferidas (no instalar en Sprint 1)

| Paquete | Sprint | Motivo del diferimiento |
|---|---|---|
| `ioredis` / Redis client | Sprint 7 | Cache se implementa en fase intermedia |
| `meilisearch` | Sprint 8 | Búsqueda avanzada en fase final |
| `@medusajs/file-local` | Sprint 2+ | Manejo de imágenes cuando haya productos reales |

---

## 6. Riesgos Técnicos

### Riesgo 1 — Curva de aprendizaje de MedusaJS v2
**Nivel:** Alto
**Descripción:** MedusaJS v2 es una reescritura completa del framework respecto a v1. El sistema de módulos, workflows y link modules tiene una curva de aprendizaje pronunciada. La documentación oficial aún tiene vacíos en casos avanzados.
**Mitigación:** Dedicar el Sprint 1 exclusivamente a aprender el framework con módulos nativos antes de desarrollar cualquier módulo personalizado. No avanzar al Sprint 2 hasta dominar los conceptos base.

---

### Riesgo 2 — Complejidad del sistema de link modules
**Nivel:** Medio-Alto
**Descripción:** Conectar entidades personalizadas (Brand, Vendor) con entidades nativas de Medusa (Product, Order) requiere entender en profundidad el sistema de link modules. Un diseño incorrecto puede generar consultas ineficientes o problemas de integridad referencial.
**Mitigación:** Diseñar y validar todos los vínculos en el Sprint 2 antes de escribir lógica de negocio sobre ellos. Documentar cada link con su propósito y las entidades involucradas.

---

### Riesgo 3 — Gestión de migraciones a largo plazo
**Nivel:** Medio
**Descripción:** Con múltiples módulos personalizados generando migraciones independientes, el control del orden de ejecución y la resolución de conflictos puede volverse complejo, especialmente cuando hay datos en producción.
**Mitigación:** Establecer desde el Sprint 2 la convención de nomenclatura de migraciones con timestamp. Nunca modificar migraciones ya ejecutadas. Revisar el estado de migraciones antes de cada deploy.

---

### Riesgo 4 — Motor de promociones avanzadas
**Nivel:** Medio
**Descripción:** Las promociones requeridas (compra X recibe Y, combos, regalos, descuentos por cantidad) van más allá de las capacidades del módulo nativo de promociones de Medusa. Implementar un motor propio requiere diseño cuidadoso para no interferir con el flujo de checkout nativo.
**Mitigación:** Analizar en detalle las capacidades del módulo nativo antes de diseñar el módulo `promotion-engine`. Intentar extender el módulo nativo antes de construir uno propio desde cero.

---

### Riesgo 5 — Rendimiento sin Redis en fase inicial
**Nivel:** Bajo-Medio
**Descripción:** Sin Redis, todas las consultas van directamente a PostgreSQL. Con catálogos grandes o tráfico alto, esto puede generar cuellos de botella antes de llegar al Sprint 7.
**Mitigación:** Diseñar consultas eficientes desde el inicio. Indexar correctamente las columnas de búsqueda frecuente. Monitorear tiempos de respuesta durante el desarrollo para detectar problemas temprano.

---

### Riesgo 6 — Desalineación entre módulos del marketplace y el checkout nativo
**Nivel:** Medio
**Descripción:** El flujo de checkout de Medusa no está diseñado nativamente para marketplace multi-vendor. Asociar órdenes a vendedores específicos sin modificar el core puede requerir soluciones no convencionales.
**Mitigación:** Investigar este punto durante el Sprint 2 cuando se diseñe el módulo `vendor`. Definir la estrategia de split de órdenes antes de implementar el frontend de checkout.

---

## Notas Finales

Este plan cubre exclusivamente el Sprint 1 en detalle. Los Sprints 2 al 9 están descritos en `docs/ROADMAP.md` y se detallarán en planes específicos al inicio de cada sprint.

El criterio de avance entre sprints es la validación completa del sprint anterior. No se avanza si quedan entregables pendientes.
