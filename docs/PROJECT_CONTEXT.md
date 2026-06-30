# MiTienda 2.0

## Proyecto

Modernización tecnológica de MiTienda Guatemala.

La plataforma actual fue desarrollada en 2018 utilizando PHP, CodeIgniter, MySQL y un CMS personalizado.

El objetivo del proyecto es construir una nueva plataforma ecommerce moderna, escalable y preparada para crecimiento futuro.

---

## Objetivos de Negocio

* Mejorar experiencia de compra.
* Facilitar administración de productos.
* Incorporar marketplace de emprendedores.
* Mejorar promociones y campañas comerciales.
* Mejorar posicionamiento SEO.
* Facilitar futuras integraciones.
* Preparar la plataforma para IA e integraciones futuras.

---

## Arquitectura General

Arquitectura Headless Ecommerce.

Frontend separado del backend.

Backend expone APIs.

Frontend consume APIs.

---

## Stack Tecnológico

### Frontend

* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui

### Backend

* MedusaJS

### Base de Datos

* PostgreSQL

### Infraestructura futura

* Redis (Fase posterior)
* Meilisearch (Fase posterior)

---

## Principios de Desarrollo

1. Nunca modificar el core de MedusaJS.
2. Toda personalización debe implementarse mediante módulos propios.
3. Mantener arquitectura desacoplada.
4. Priorizar mantenibilidad sobre rapidez.
5. Toda funcionalidad debe documentarse.
6. Todo módulo debe poder evolucionar sin afectar otros módulos.

---

## Módulos Principales

### Ecommerce Core

* Productos
* Categorías
* Variantes
* Inventario
* Clientes
* Carrito
* Checkout
* Órdenes

### Marketplace

* Emprendedores
* Perfil de vendedor
* Productos por vendedor

### Promociones

* Descuentos
* Regalos
* Combos
* Promociones por cantidad

### Marcas

* Gestión de marcas
* Navegación por marca

### CMS

* Banners
* FAQ
* Políticas
* Contenido institucional

### Shipping

* Reglas de envío
* Costos variables

---

## Inspiración UI

* Mercado Libre
* Shopify Plus
* Falabella

---

## Restricciones

No implementar IA en la primera versión.

No implementar aplicaciones móviles.

No implementar integraciones complejas hasta finalizar MVP.

No realizar migración automática de productos.

Los productos serán cargados nuevamente por el cliente.

---

## Objetivo del MVP

Entregar una plataforma ecommerce moderna con marketplace básico y promociones avanzadas que permita reemplazar completamente la plataforma actual.
