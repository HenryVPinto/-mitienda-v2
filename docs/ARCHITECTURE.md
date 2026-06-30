# Arquitectura MiTienda 2.0

## Arquitectura General

Headless Ecommerce

Frontend y Backend completamente desacoplados.

---

## Diagrama General

Next.js Frontend

↓

MedusaJS API

↓

PostgreSQL

---

## Fase Inicial

Componentes:

* Next.js
* MedusaJS
* PostgreSQL

Objetivo:

Reducir complejidad y acelerar aprendizaje.

---

## Fase Intermedia

Se agregará:

* Redis

Uso:

* Cache
* Sesiones
* Optimización de consultas

---

## Fase Avanzada

Se agregará:

* Meilisearch

Uso:

* Búsquedas rápidas
* Autocompletado
* Índices de catálogo

---

## Módulos Personalizados

Todos los módulos personalizados deberán desarrollarse fuera del núcleo de Medusa.

Estructura esperada:

src/

modules/

* brand
* vendor
* promotions
* cms
* shipping

---

## Entidades Principales

### Product

Entidad base de Medusa.

Extensiones futuras:

* brand_id
* vendor_id
* wholesale_price
* weight

---

### Brand

Representa marcas comerciales.

---

### Vendor

Representa emprendedores y vendedores.

---

### Promotion

Motor de promociones.

---

### CMS

Contenido administrable.

---

### ShippingRule

Reglas dinámicas de envío.

---

## Principio Arquitectónico

El sistema debe poder incorporar nuevas funcionalidades sin modificar módulos existentes.

Toda nueva funcionalidad deberá implementarse mediante módulos desacoplados.

Nunca modificar el core de MedusaJS.

Nunca acoplar frontend directamente a la base de datos.

Toda comunicación debe realizarse mediante APIs.
