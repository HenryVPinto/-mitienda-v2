# Sprint 1 — Verificación de Arranque

Fecha: 2026-06-05
Versión backend: MedusaJS 2.15.5
Estado: **Listo para ejecutar**

---

## Decisión de Go / No-Go

| Fase | Estado |
|---|---|
| Auditoría técnica | Completada |
| Hallazgos críticos resueltos | Sí (3/3) |
| Hallazgos altos resueltos | Sí (5/5) |
| Hallazgos medios/bajos | Pendientes (no bloquean Sprint 1) |
| **Veredicto** | **GO — proceder con `npm install`** |

---

## 1. Verificación de Entorno

Ejecutar antes de cualquier otra cosa.

```bash
node --version
# Debe mostrar: v22.20.0 (o >= 20.0.0)

npm --version
# Debe mostrar: >= 9.0.0

psql --version
# Debe mostrar: PostgreSQL 15.x o superior

pg_isready
# Debe mostrar: /tmp:5432 - accepting connections
```

- [ ] Node.js >= 20.0.0 instalado
- [ ] npm >= 9.0.0 instalado
- [ ] PostgreSQL >= 15 instalado
- [ ] Servidor PostgreSQL activo y aceptando conexiones

---

## 2. Verificación de Archivos del Proyecto

Confirmar que todos los archivos críticos existen en `backend/`:

```bash
ls -la backend/
# Debe mostrar: .env.example, .nvmrc, medusa-config.ts, package.json, tsconfig.json, README.md

ls backend/src/api/
# Debe mostrar: middlewares.ts, admin/, store/

ls backend/src/scripts/
# Debe mostrar: seed.ts
```

- [ ] `backend/package.json` existe
- [ ] `backend/medusa-config.ts` existe
- [ ] `backend/tsconfig.json` existe
- [ ] `backend/.env.example` existe
- [ ] `backend/.nvmrc` existe
- [ ] `backend/src/api/middlewares.ts` existe
- [ ] `backend/src/scripts/seed.ts` existe

---

## 3. Configuración de Variables de Entorno

```bash
cd backend
cp .env.example .env
```

Editar `backend/.env` y verificar que cada variable tiene un valor real:

```bash
# Generar secretos seguros (ejecutar dos veces, uno para cada secreto):
openssl rand -base64 32
```

- [ ] Archivo `backend/.env` existe (copiado desde `.env.example`)
- [ ] `DATABASE_URL` apunta a `postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev`
- [ ] `JWT_SECRET` tiene un valor (puede ser el fallback de desarrollo, no es bloqueante)
- [ ] `COOKIE_SECRET` tiene un valor (puede ser el fallback de desarrollo, no es bloqueante)
- [ ] `STORE_CORS` configurado (`http://localhost:3000` para desarrollo)
- [ ] `ADMIN_CORS` configurado (`http://localhost:9000`)
- [ ] `AUTH_CORS` configurado
- [ ] `MEDUSA_BACKEND_URL` configurado (`http://localhost:9000`)

> **Nota de seguridad:** Los valores de `JWT_SECRET` y `COOKIE_SECRET` en el .env.example son ejemplos. Para desarrollo local el sistema arrancará con un fallback interno, pero se recomienda usar valores reales generados con `openssl rand -base64 32` desde el primer día.

---

## 4. Instalación de Dependencias

```bash
cd backend
npm install
```

Verificar la salida de `npm install`:

```bash
# Verificar que el binario medusa existe:
ls node_modules/.bin/medusa
# Debe existir

# Verificar que ioredis está instalado:
ls node_modules/ioredis
# Debe existir

# Verificar que @medusajs/framework está instalado:
ls node_modules/@medusajs/framework
# Debe existir
```

- [ ] `npm install` completó sin errores
- [ ] No hay errores de peer dependencies en la salida (warnings son aceptables)
- [ ] `node_modules/.bin/medusa` existe
- [ ] `node_modules/ioredis` existe
- [ ] `node_modules/@medusajs/framework` existe
- [ ] `node_modules/pg` existe

---

## 5. Configuración PostgreSQL

Conectarse como superusuario de PostgreSQL:

```bash
psql -U postgres
```

Ejecutar en orden exacto:

```sql
-- Crear usuario
CREATE USER mitienda_user WITH PASSWORD 'mitienda_pass';

-- Crear base de datos con ese usuario como owner
CREATE DATABASE mitienda_dev OWNER mitienda_user;

-- Otorgar privilegios sobre la base de datos
GRANT ALL PRIVILEGES ON DATABASE mitienda_dev TO mitienda_user;

-- Conectarse a la nueva base de datos
\c mitienda_dev

-- Otorgar permisos sobre el schema público (REQUERIDO en PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mitienda_user;

-- Salir
\q
```

Verificar conexión con el usuario de la aplicación:

```bash
psql postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev -c '\dt'
# Debe conectar sin error (puede mostrar "No relations found" — es correcto antes de migrar)
```

- [ ] Usuario `mitienda_user` creado
- [ ] Base de datos `mitienda_dev` creada con `mitienda_user` como owner
- [ ] Privilegios sobre la base de datos otorgados
- [ ] Permisos de schema public otorgados (PG15+)
- [ ] Permisos de default privileges configurados
- [ ] Conexión verificada con `psql postgres://mitienda_user:...`

---

## 6. Migraciones

```bash
cd backend
npm run db:migrate
```

Verificar resultado:

```bash
psql postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev -c '\dt'
# Debe mostrar las tablas creadas por Medusa (product, order, customer, etc.)
```

- [ ] `npm run db:migrate` completó sin errores
- [ ] La salida muestra migraciones ejecutadas (no errores)
- [ ] Las tablas de Medusa existen en la base de datos

---

## 7. Creación de Usuario Administrador

```bash
cd backend
npx medusa user --email admin@mitienda.com --password "password_seguro"
```

- [ ] El comando completó sin errores
- [ ] Se muestra confirmación del usuario creado en la consola

---

## 8. Primer Arranque

```bash
cd backend
npm run dev
```

Esperar hasta ver el mensaje de inicio exitoso de Medusa en la consola (el primer arranque puede tardar 20–40 segundos mientras compila el admin dashboard).

Verificar health check:

```bash
curl http://localhost:9000/health
# Respuesta esperada: {"status":"ok"}
```

- [ ] `npm run dev` inicia sin errores en consola
- [ ] El servidor escucha en el puerto 9000
- [ ] `GET http://localhost:9000/health` devuelve `{"status":"ok"}`

---

## 9. Verificación del Panel Administrativo

Abrir en el navegador: `http://localhost:9000/app`

- [ ] La página de login del panel admin carga correctamente
- [ ] Login con `admin@mitienda.com` y la contraseña configurada funciona
- [ ] El dashboard muestra el panel principal sin errores en consola del navegador
- [ ] El menú de Products, Orders, Customers es accesible

---

## 10. Smoke Test del API

Con el servidor corriendo, ejecutar desde una terminal:

```bash
# Store API — público, sin autenticación
curl http://localhost:9000/store/products
# Respuesta esperada: {"products":[],"count":0,"offset":0,"limit":50}

curl http://localhost:9000/store/categories
# Respuesta esperada: {"product_categories":[],"count":0,"offset":0,"limit":100}

# Admin API — obtener token
curl -X POST http://localhost:9000/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@mitienda.com","password":"password_seguro"}'
# Respuesta esperada: {"token":"..."}

# Admin API — usar token (reemplazar TOKEN con el valor obtenido)
curl http://localhost:9000/admin/products \
  -H "Authorization: Bearer TOKEN"
# Respuesta esperada: {"products":[],"count":0,"offset":0,"limit":50}
```

- [ ] `GET /store/products` devuelve 200 con lista vacía
- [ ] `GET /store/categories` devuelve 200 con lista vacía
- [ ] `POST /auth/user/emailpass` devuelve un token JWT
- [ ] `GET /admin/products` con token devuelve 200

---

## Criterio de Aceptación del Sprint 1

El Sprint 1 está completado cuando **todos los checks anteriores están marcados**.

El resultado es un backend MedusaJS funcional con:
- PostgreSQL configurado y con esquema de Medusa migrado
- Panel administrativo accesible
- API Store y Admin respondiendo correctamente
- Estructura de carpetas lista para recibir módulos personalizados en Sprint 2

---

## Pendientes para Sprint 2

Los siguientes hallazgos de la auditoría quedan diferidos al Sprint 2 (no bloquean Sprint 1):

| Hallazgo | Descripción |
|---|---|
| MEDIO-1 | Verificar clave `admin.backendUrl` en medusa-config.ts |
| MEDIO-2 | Evaluar `moduleResolution: "Bundler"` en tsconfig.json |
| MEDIO-3 | Mover `@medusajs/admin-sdk` a `dependencies` cuando se implementen extensiones |
| MEDIO-5 | Usar versiones exactas (sin `^`) en paquetes Medusa core |
| BAJO-1 | Eliminar entradas duplicadas en `.gitignore` |
| BAJO-2 | Agregar `GET /health` al README |
| BAJO-3 | Actualizar `@types/node` a `^22` |
| BAJO-4 | Agregar `medusa-config.d.ts` al `.gitignore` |
