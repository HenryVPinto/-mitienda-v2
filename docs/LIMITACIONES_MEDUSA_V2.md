# Limitaciones y comportamientos clave de Medusa v2
> Referencia para el manual del cliente y para el equipo de desarrollo.
> Versión de Medusa: 2.15.x

---

## Productos

### Un producto pertenece a una sola colección
Cada producto tiene un único `collection_id`. Si se asigna a una nueva colección, se quita de la anterior automáticamente.

**Impacto en MiTienda:** La funcionalidad "Complementa tu compra" usa colecciones. Si un producto ya pertenece a otra colección (ej. "Herramientas"), no puede estar simultáneamente en un kit (ej. "Kit Solar").

**Recomendación:** Reservar las colecciones exclusivamente para kits/combos. Usar categorías para clasificación general del catálogo.

---

### Las imágenes de variante son independientes de las imágenes del producto
Las imágenes asignadas en la sección "Variantes" del producto en el admin son propias de cada variante. Las imágenes del producto general aparecen en la galería principal.

**Impacto en MiTienda:** La galería del detalle de producto muestra la imagen de la variante seleccionada si existe; si no, cae al thumbnail del producto.

---

### El campo `description` es texto plano o HTML (no mixto)
Medusa guarda `description` como string. MiTienda usa el widget de descripción enriquecida que guarda HTML. Si se edita la descripción desde el modal nativo del admin de Medusa (el ícono de edición en la cabecera del producto), se mostrará el HTML crudo como texto.

**Recomendación:** Usar siempre el widget "Descripción enriquecida" en la sección de detalle del producto, nunca el campo nativo del modal.

---

### Precios en quetzales enteros (sin centavos)
Los precios se almacenan en quetzales enteros. `1450` equivale a Q1,450.00. Medusa por defecto trabaja en centavos pero esta instalación está configurada para quetzales completos.

**Impacto:** Al ingresar precios en el admin, ingresar el valor tal cual: si el producto vale Q250, ingresar `250`. No multiplicar por 100.

---

### El precio de oferta usa `compare_at_price` en metadata
La función "Precio de oferta" del widget del admin **modifica el precio real de la variante** y guarda el precio original en `variant.metadata.compare_at_price`. Esto garantiza que el carrito y checkout cobren el precio correcto de oferta.

**Impacto:** Al quitar la oferta desde el widget, el precio original se restaura automáticamente. Si se edita el precio manualmente desde el admin de variantes sin usar el widget, `compare_at_price` puede quedar desincronizado.

**Recomendación:** Siempre usar el widget "Precio de oferta" para activar o desactivar promociones de precio.

---

## Vendedores

### Un vendedor solo puede tener un correo electrónico registrado
La API de solicitud de vendedor (`/store/vendor-applications`) rechaza correos duplicados. Si un vendedor envía dos solicitudes con el mismo correo, la segunda es rechazada con error.

---

### Aprobar un vendedor no le crea credenciales de acceso al admin
Al aprobar una solicitud desde Admin → Vendedores, el vendedor queda activo (`is_active: true`) en la base de datos, pero eso no crea un usuario de Medusa Admin automáticamente. La gestión de productos del vendedor la hace el administrador de la plataforma.

---

### La foto de perfil del vendedor se guarda en almacenamiento local
Las fotos se suben a `/static/uploads/` en el servidor backend. En producción, este directorio debe estar montado en almacenamiento persistente (volumen Docker, S3, etc.) para que las imágenes sobrevivan a reinicios del servidor.

---

## Categorías

### Las categorías forman un árbol (padre → hijo)
Medusa soporta categorías anidadas. El storefront muestra solo las categorías raíz (sin padre) en la barra de navegación y en el home.

**Impacto:** Si se crea una categoría sin asignarle padre, aparece en el menú de navegación automáticamente.

---

## Búsqueda

### La búsqueda nativa solo cubre título y descripción
El parámetro `q` de `/store/products` busca en `title` y `description` del producto. No busca en nombre de marca, nombre de vendedor, SKU de variante ni atributos custom.

**Impacto:** Para encontrar un producto por marca o vendedor, el usuario debe navegar por las secciones `/marca/:handle` o `/vendedor/:handle`.

---

## CMS

### Las páginas CMS sin slug configurado dan 404
El renderer `[slug]/page.tsx` del storefront maneja cualquier slug que exista en la tabla CMS. Si se crea una página en Admin → Content → Pages pero no se publica (`is_published: false`), el storefront devuelve 404.

**Slugs del footer que deben crearse en el CMS:**
- `/envios` — Envíos y entregas
- `/devoluciones` — Política de devoluciones
- `/metodos-de-pago` — Métodos de pago aceptados
- `/quienes-somos` — Sobre MiTienda

---

## Órdenes y checkout

### Los compradores siempre operan como invitados
El storefront no tiene sistema de cuentas de comprador. Cada orden se crea con el email del comprador como identificador. Para rastrear pedidos, el comprador usa su número de orden en `/mi-cuenta`.

---

## Reglas de precio (mayoreo / descuento por cantidad)

### Las reglas de precio solo aplican si el carrito incluye `region_id`
Las promociones del motor custom (`QUANTITY_DISCOUNT`, `WHOLESALE`, etc.) se evalúan enviando `region_id` en el request de evaluación. Sin `region_id` válido, no se aplican descuentos.

---

## Infraestructura

### El backend requiere reinicio al agregar nuevos módulos o migraciones
Medusa carga los módulos al iniciar. Cualquier nuevo módulo custom, nueva migración o cambio en `medusa-config.ts` requiere reiniciar el proceso del backend (`npm run dev` o el contenedor Docker).

### Los widgets del admin se compilan junto con el backend
Los archivos en `src/admin/widgets/` y `src/admin/routes/` se empaquetan al iniciar. Un cambio en un widget requiere reiniciar el backend para verse reflejado en el panel admin.
