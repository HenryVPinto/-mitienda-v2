# Sprint 5 — CMS: Banners, FAQ, Páginas estáticas

## Objetivo
Gestión de contenido editorial desde el admin: banners promocionales, preguntas frecuentes y páginas estáticas (términos, privacidad, etc.). El frontend consumirá estos datos vía Store API.

---

## Módulo `cms`

**Prefijo:** `mtcms`  
**Resolve key:** `"cms"` → `CMS_MODULE = "cms"`

### Modelos

#### MtBanner
| Campo | Tipo | Notas |
|---|---|---|
| id | id prefix `mtbnr` | PK |
| title | text | |
| subtitle | text nullable | |
| image_url | text | URL de imagen |
| link_url | text nullable | Destino del banner |
| position | enum `["HOME","CATEGORY","PROMO"]` | Dónde aparece |
| sort_order | number default 0 | Orden de presentación |
| is_active | boolean default true | |
| starts_at | dateTime nullable | Vigencia inicio |
| ends_at | dateTime nullable | Vigencia fin |

#### MtFaqItem
| Campo | Tipo | Notas |
|---|---|---|
| id | id prefix `mtfaq` | PK |
| question | text | Pregunta |
| answer | text | Respuesta (markdown) |
| category | text nullable | Agrupación (ej. "Envíos") |
| sort_order | number default 0 | |
| is_active | boolean default true | |

#### MtPage
| Campo | Tipo | Notas |
|---|---|---|
| id | id prefix `mtpag` | PK |
| slug | text unique | ej. "terminos", "privacidad" |
| title | text | |
| content | text | Markdown / HTML |
| is_published | boolean default false | |
| metadata | json nullable | SEO, etc. |

---

## API Admin

Todos los endpoints requieren `authenticate("user", ["session","bearer","api-key"])`.

### Banners
- `GET  /admin/cms/banners` — lista todos (supports `?position=HOME`)
- `POST /admin/cms/banners` — crear
- `GET  /admin/cms/banners/:id`
- `PATCH /admin/cms/banners/:id`
- `DELETE /admin/cms/banners/:id`

### FAQ
- `GET  /admin/cms/faq`
- `POST /admin/cms/faq`
- `GET  /admin/cms/faq/:id`
- `PATCH /admin/cms/faq/:id`
- `DELETE /admin/cms/faq/:id`

### Páginas
- `GET  /admin/cms/pages`
- `POST /admin/cms/pages`
- `GET  /admin/cms/pages/:id`
- `PATCH /admin/cms/pages/:id`
- `DELETE /admin/cms/pages/:id`

---

## API Store (read-only, requiere x-publishable-api-key)

- `GET /store/cms/banners?position=HOME` — banners activos y vigentes
- `GET /store/cms/faq?category=Envíos` — FAQ activos (category opcional)
- `GET /store/cms/pages/:slug` — página publicada por slug

---

## Admin UI

> Carpeta raíz: `src/admin/routes/content/` (evitar conflicto con rutas nativas de Medusa)

### `/app/content/banners`
- Tabla: imagen thumbnail, título, posición badge, fechas, activo toggle
- Crear: formulario con upload de imagen (igual que logos de marcas), campos de texto, position select, fechas opcionales
- Editar inline (igual que Sprint 3/4)
- Eliminar con confirm

### `/app/content/faq`
- Tabla: pregunta, categoría badge, sort_order, activo
- Crear/editar: textarea para respuesta (markdown)
- Eliminar con confirm

### `/app/content/pages`
- Tabla: slug, título, publicado badge
- Crear/editar: textarea grande para content (markdown/HTML)
- Campo slug con validación de caracteres permitidos

---

## Orden de implementación

1. **Módulo CMS** — modelos + service + index.ts
2. **Registrar en medusa-config.ts** y correr migración
3. **API Admin** — banners, faq, pages (routes separados)
4. **Middleware** — agregar matcher `/admin/cms*`
5. **API Store** — 3 endpoints read-only
6. **Admin UI** — páginas content/banners, content/faq, content/pages
7. **Smoke test** — crear/leer/actualizar/eliminar cada entidad

---

## Smoke tests

```bash
TOKEN="<bearer>"
BASE="http://localhost:9000"

# Crear banner
curl -s -X POST $BASE/admin/cms/banners \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Promo Verano","image_url":"https://placehold.co/1200x400","position":"HOME","is_active":true}' | jq .

# Listar banners
curl -s $BASE/admin/cms/banners \
  -H "Authorization: Bearer $TOKEN" | jq .

# Store — banners activos
PK="pk_42a9a241e2da54a178f8063bde40608bd98e519cd7817e4f673a87208e498414"
curl -s "$BASE/store/cms/banners?position=HOME" \
  -H "x-publishable-api-key: $PK" | jq .

# Crear FAQ
curl -s -X POST $BASE/admin/cms/faq \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"¿Cuánto tarda el envío?","answer":"Generalmente 2-3 días hábiles.","category":"Envíos","is_active":true}' | jq .

# Crear página
curl -s -X POST $BASE/admin/cms/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"slug":"terminos","title":"Términos y Condiciones","content":"## Términos\n\nContenido aquí.","is_published":true}' | jq .

# Store — página por slug
curl -s "$BASE/store/cms/pages/terminos" \
  -H "x-publishable-api-key: $PK" | jq .
```

---

## Notas técnicas

- El campo `content` de MtPage es `text` (no `json`) para soportar markdown largo sin escaping.
- La UI de banners reutiliza el mismo patrón de upload de imágenes de `src/admin/routes/brands/page.tsx` (`POST /admin/uploads`).
- Los stores endpoints filtran `is_active: true` y validan vigencia (`starts_at`/`ends_at`) igual que el evaluate de promociones.
- No hay links a otros módulos en este sprint — CMS es standalone.
