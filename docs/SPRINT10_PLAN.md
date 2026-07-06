# Sprint 10 — Dominio Custom y CDN

## Objetivo
Conectar `miti.com.gt` a Cloudflare, configurar `api.miti.com.gt` para el backend en Railway y resolver la carga lenta del admin JS.

---

## Prerequisito
Verificar que los nameservers ya propagaron antes de empezar:
- Ir a https://who.is/whois/miti.com.gt y confirmar que los nameservers son los de Cloudflare (ej. `aria.ns.cloudflare.com`)

---

## Paso 1 — Agregar dominio custom en Railway

1. Railway → servicio backend → **Settings → Custom Domain**
2. Agregar `api.miti.com.gt`
3. Railway devuelve un **CNAME target** (algo como `xxx.railway.internal`)

---

## Paso 2 — Configurar DNS en Cloudflare

En Cloudflare → `miti.com.gt` → **DNS → Add record**:

```
Type:    CNAME
Name:    api
Target:  <CNAME target de Railway>
Proxy:   ON (nube naranja) ← esto activa el CDN
```

Esperar ~1 minuto a que Railway valide el dominio.

---

## Paso 3 — Actualizar variables de entorno

### Railway — backend
```
MEDUSA_BACKEND_URL=https://api.miti.com.gt
ADMIN_CORS=https://api.miti.com.gt
STORE_CORS=https://frontend-pi-gules-33.vercel.app
AUTH_CORS=https://api.miti.com.gt,https://frontend-pi-gules-33.vercel.app
```

### Vercel — frontend
```
NEXT_PUBLIC_MEDUSA_URL=https://api.miti.com.gt
```

Redeploy de Vercel después de actualizar.

---

## Paso 4 — Verificar

- Admin: `https://api.miti.com.gt/app` debe cargar rápido (Cloudflare comprime y cachea el JS)
- Storefront: productos y carrito funcionando contra el nuevo dominio
- Imágenes: R2 sigue funcionando (no cambia nada en file storage)

---

## Opcional — Dominio para el frontend

Si se quiere `tienda.miti.com.gt` para el storefront:
1. Vercel → proyecto → **Settings → Domains** → agregar `tienda.miti.com.gt`
2. Vercel da un CNAME → agregar en Cloudflare con nube naranja
3. Actualizar `STORE_CORS` y `AUTH_CORS` en Railway con el nuevo dominio

---

## Paso 5 — Agregar dominio para el storefront (pendiente)

Agregar `tienda.miti.com.gt` para el frontend:
1. Vercel → proyecto → **Settings → Domains** → agregar `tienda.miti.com.gt`
2. Vercel da un CNAME → agregar en Cloudflare con nube naranja
3. Actualizar variables en Railway:
   ```
   STORE_CORS=https://tienda.miti.com.gt
   AUTH_CORS=https://api.miti.com.gt,https://tienda.miti.com.gt
   ```
4. Actualizar en Vercel si aplica y hacer redeploy

---

## Estado

| Tarea | Estado |
|-------|--------|
| Nameservers migrados a Cloudflare | ✅ Completado (2026-07-02) |
| CNAME api.miti.com.gt en Railway | ✅ Completado (integración directa Railway↔Cloudflare) |
| DNS Cloudflare configurado | ✅ Completado |
| Variables de entorno actualizadas | ✅ Completado |
| Admin carga rápido con CDN | ✅ Completado |
| Dominio tienda.miti.com.gt | ⏳ Pendiente (Paso 5) |

---

## Update 2026-07-05 — Fixes e implementaciones post-producción

### Correcciones de bugs

| Bug | Archivo(s) | Solución |
|-----|-----------|----------|
| Badge OFERTA no aparecía en catálogo/categorías | `catalogo/page.tsx`, `categoria/[handle]/page.tsx` | Agregar `variants.metadata` al fields del fetch |
| Descripción HTML se mostraba como texto plano | `producto/[handle]/page.tsx` | Cambiar detector de `startsWith("<")` a `/<[a-z]/i.test()` |
| Specs mostraban campos admin (Is Featured: true…) | `product-detail.tsx` | Filtro `typeof v !== "boolean"` + ampliar `METADATA_SKIP` |
| Marca duplicada en tarjetas de producto | `product-card.tsx` | Eliminar badge de esquina; solo queda logo inferior |
| Error "Cannot create multiple links" al asignar vendor | `links/product-vendor.ts`, `vendor/route.ts` | `isList: true` en `defineLink` para permitir vendor en múltiples productos |

### Nuevas funcionalidades

| Feature | Archivos | Descripción |
|---------|---------|-------------|
| Carrusel productos destacados | `home/featured-slider.tsx`, `page.tsx` | Slider auto-deslizante con flechas y dots en home |
| Slider de marcas | `home/brands-slider.tsx`, `page.tsx` | Carrusel animado de marcas en home |
| Video YouTube/TikTok en productos | `product-video-widget.tsx`, `product-detail.tsx` | Widget admin para guardar URL en `metadata.video_url`; embed responsive en storefront (16:9 YouTube, 9:16 TikTok) |
| Orden de categorías | `category-rank-widget.tsx`, `page.tsx`, `layout.tsx`, `catalogo/page.tsx` | Widget admin con campo numérico de rank (0 = primera); frontend ordena por rank en home, navbar y catálogo |

### Commits
| Hash | Descripción |
|------|-------------|
| `ebeec3e` | fix: marca duplicada, specs admin, HTML en descripción, vendor |
| `2c8dfab` | fix: vendor isList — permitir vendor en múltiples productos |
| `2480af8` | feat: video YouTube/TikTok en admin widget y storefront |
| `b3e52fc` | feat: orden de categorías por rank en admin y frontend |
