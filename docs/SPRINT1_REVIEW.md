# Sprint 1 — Auditoría Técnica

Fecha: 2026-06-05
Alcance: Backend MedusaJS v2 — estructura inicial pre-instalación
Estado: **Hallazgos Críticos y Altos resueltos — listo para `npm install`**

---

## Cambios Aplicados

Los siguientes hallazgos fueron corregidos después de la auditoría inicial:

| Hallazgo | Archivo modificado | Cambio aplicado |
|---|---|---|
| CRÍTICO-1 | `package.json` | Agregado `ioredis: ^5.4.1` a `dependencies` |
| CRÍTICO-2 | `package.json` | Agregado `@medusajs/framework: ^2.15.5` a `dependencies` |
| CRÍTICO-3 | `README.md` | Agregados comandos PG15 para permisos de schema public |
| ALTO-1 | `package.json` | Script `db:generate` corregido a `medusa db:generate --module` |
| ALTO-2 | `package.json` + `README.md` | Eliminado script `db:create`; documentado proceso manual |
| ALTO-3 | `README.md` | Comando `medusa user` corregido a flags `--email` / `--password` |
| ALTO-4 | `medusa-config.ts` | Agregado fallback de desarrollo para `JWT_SECRET` y `COOKIE_SECRET` |
| ALTO-5 | `backend/.nvmrc` | Creado con versión `22.20.0` para fijar Node.js del proyecto |
| — | `src/scripts/seed.ts` | Creado placeholder para evitar error del script `seed` |

Los hallazgos Medio y Bajo permanecen pendientes para resolución futura.

---

## Resumen Ejecutivo

La arquitectura general es sólida y sigue correctamente las convenciones de MedusaJS v2. La estructura de carpetas, la separación de responsabilidades y la configuración base son profesionales. Sin embargo, se identificaron **3 hallazgos críticos** que causarían fallos directos al levantar el servidor, y **5 hallazgos de nivel alto** que deben resolverse antes de la primera ejecución real.

| Nivel | Cantidad | Estado |
|---|---|---|
| Crítico | 3 | Resueltos |
| Alto | 5 | Resueltos |
| Medio | 6 | Pendientes |
| Bajo | 4 | Pendientes |

---

## Evaluación por Componente

| Componente | Estado | Nota |
|---|---|---|
| Estructura de carpetas | Aprobado | Sigue exactamente las convenciones de Medusa v2 |
| package.json | Requiere ajustes | Faltan dependencias críticas |
| medusa-config.ts | Requiere ajustes | Clave de admin y manejo de secrets |
| Variables de entorno | Aprobado con observaciones | Bien estructurado, falta validación de arranque |
| Configuración PostgreSQL | Requiere ajustes | Permisos PG15 incompletos en README |
| Scripts npm | Requiere ajustes | Dos scripts no funcionan como están |
| README técnico | Requiere ajustes | Comandos incorrectos o incompletos |
| .gitignore | Aprobado con observaciones | Sólido, duplicaciones menores |
| Compatibilidad MedusaJS 2.x | Aprobado | Node.js 22 compatible (>= 20 requerido) |

---

## Hallazgos

---

### CRÍTICO-1 — `ioredis` ausente como dependencia declarada `[RESUELTO]`

**Archivo:** `package.json`

`@medusajs/framework@2.15.5` declara `ioredis: ^5.4.1` como peerDependency. Medusa v2 usa ioredis en su sistema interno de eventos y colas, incluso cuando Redis no está activo. npm 7+ instala peer dependencies automáticamente, pero sin declaración explícita en `package.json` el comportamiento es impredecible: puede instalarse con una versión en conflicto o no instalarse si npm decide omitirlo.

**Impacto:** El servidor puede fallar al iniciar con `Error: Cannot find module 'ioredis'`.

**Corrección:**
```json
"dependencies": {
  "ioredis": "^5.4.1"
}
```

---

### CRÍTICO-2 — `@medusajs/framework` no declarado pero importado directamente `[RESUELTO]`

**Archivos:** `medusa-config.ts` (línea 1), `src/api/middlewares.ts` (línea 1)

```typescript
// medusa-config.ts
import { defineConfig, loadEnv } from "@medusajs/framework/config"

// src/api/middlewares.ts
import { defineMiddlewares } from "@medusajs/framework/http"
```

`@medusajs/framework` es peerDependency de `@medusajs/medusa`, no dependencia directa. En teoría npm 7+ lo instala, pero al ser una importación explícita en el código del proyecto, el paquete debe estar declarado en `package.json`. Si npm lo instala con una versión incorrecta o en un path distinto, los imports fallarán silenciosamente o en runtime.

**Impacto:** Posible `Module not found: @medusajs/framework` al arrancar.

**Corrección:**
```json
"dependencies": {
  "@medusajs/framework": "^2.15.5"
}
```

---

### CRÍTICO-3 — Permisos PostgreSQL 15 incompletos `[RESUELTO]`

**Archivo:** `README.md` (sección "Crear la base de datos")

El README documenta:
```sql
CREATE USER mitienda_user WITH PASSWORD 'mitienda_pass';
CREATE DATABASE mitienda_dev OWNER mitienda_user;
GRANT ALL PRIVILEGES ON DATABASE mitienda_dev TO mitienda_user;
```

**El problema:** En PostgreSQL 15, `GRANT ALL PRIVILEGES ON DATABASE` ya no otorga permisos sobre el schema `public`. Este cambio fue intencional y documentado en las release notes de PG15. El usuario `mitienda_user` tendrá conexión pero no podrá crear tablas, resultando en:

```
ERROR: permission denied for schema public
```

Las migraciones de Medusa fallarán en el primer `npm run db:migrate`.

**Corrección — agregar al README:**
```sql
CREATE USER mitienda_user WITH PASSWORD 'mitienda_pass';
CREATE DATABASE mitienda_dev OWNER mitienda_user;
GRANT ALL PRIVILEGES ON DATABASE mitienda_dev TO mitienda_user;
\c mitienda_dev
GRANT ALL ON SCHEMA public TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mitienda_user;
```

---

### ALTO-1 — Script `db:generate` no funciona sin parámetro `[RESUELTO]`

**Archivo:** `package.json`, `README.md`

```json
"db:generate": "medusa db:generate"
```

El comando `medusa db:generate` requiere el nombre del módulo como argumento:
```bash
medusa db:generate --module brand
```

Ejecutar `npm run db:generate` sin argumentos devolverá un error o no generará nada. El README lo documenta como si fuera suficiente.

**Impacto:** Confusión al intentar crear migraciones en Sprint 2+. Falla silenciosa o error de CLI.

**Corrección — actualizar script en package.json:**
```json
"db:generate": "medusa db:generate --module"
```
Y documentar en README: `npm run db:generate brand`

---

### ALTO-2 — Script `db:create` tiene problema chicken-and-egg `[RESUELTO]`

**Archivo:** `package.json`, `README.md`

```json
"db:create": "medusa db:create"
```

`medusa db:create` intenta conectarse usando la `DATABASE_URL` configurada, que apunta a `mitienda_dev`. Si esa base de datos no existe, la conexión falla antes de poder crearla. Es un problema de dependencia circular.

Adicionalmente, el README ya documenta correctamente cómo crear la DB con comandos SQL directos. El script `db:create` puede dar falsa sensación de que automatiza ese paso.

**Impacto:** El script falla en el primer uso. El desarrollador puede pensar que hay un error de configuración cuando en realidad es un problema de orden de operaciones.

**Corrección — opciones:**
- Opción A: Eliminar el script `db:create` del package.json y solo documentar el proceso manual.
- Opción B: Cambiar el script para usar la DB `postgres` como conexión temporal: `DATABASE_URL=postgres://mitienda_user:mitienda_pass@localhost:5432/postgres medusa db:create`

---

### ALTO-3 — Comando `medusa user` en README puede ser incorrecto para v2 `[RESUELTO]`

**Archivo:** `README.md`

El README documenta:
```bash
npx medusa user -e admin@mitienda.com -p password_seguro
```

En Medusa v2 (a partir de v2.x), el comando para crear usuarios admin cambió. La sintaxis correcta verificada en el CLI de Medusa v2 es:
```bash
npx medusa user --email admin@mitienda.com --password "password_seguro"
```

Los flags `-e` y `-p` son forma corta que puede no existir en v2 o puede tener comportamiento diferente.

**Impacto:** El primer intento de crear el usuario admin falla. El desarrollador no puede acceder al panel administrativo.

**Corrección — actualizar en README:**
```bash
npx medusa user --email admin@mitienda.com --password "password_seguro"
```

---

### ALTO-4 — `JWT_SECRET` y `COOKIE_SECRET` sin fallback de desarrollo `[RESUELTO]`

**Archivo:** `medusa-config.ts` (líneas 19–20)

```typescript
jwtSecret: process.env.JWT_SECRET!,
cookieSecret: process.env.COOKIE_SECRET!,
```

El operador `!` le dice a TypeScript que el valor no es `undefined`, pero no lo garantiza en runtime. Si el archivo `.env` no está creado o las variables no están definidas, Medusa iniciará y fallará con un error críptico al primer request autenticado, no al arranque.

Los valores de ejemplo en `.env.example` son literales de texto descriptivos:
```
JWT_SECRET=cambia_este_secreto_por_uno_seguro_en_produccion
```

Si el desarrollador copia `.env.example` sin editar estas variables, el sistema funcionará técnicamente pero con un secreto predecible — una vulnerabilidad de seguridad grave.

**Impacto:** Secretos predecibles en desarrollo descuidado. Posible ruptura en runtime si variables no definidas.

**Corrección — en medusa-config.ts, separar entornos:**
```typescript
jwtSecret: process.env.JWT_SECRET || (process.env.NODE_ENV === "production" ? undefined! : "dev-jwt-insecure"),
cookieSecret: process.env.COOKIE_SECRET || (process.env.NODE_ENV === "production" ? undefined! : "dev-cookie-insecure"),
```
Y en `.env.example`, usar valores que sean obviamente no seguros pero funcionales para desarrollo.

---

### ALTO-5 — Falta `.nvmrc` para fijar versión de Node.js `[RESUELTO]`

**Archivo:** No existe.

El sistema tiene Node.js 22.20.0. Medusa requiere `>= 20` y el `engines` field del `package.json` refleja esto. Pero sin `.nvmrc` o `.node-version`, no hay forma de fijar la versión para todos los entornos.

Node.js 22 es compatible con Medusa (cumple `>= 20`), pero Node.js 20 LTS es el entorno más probado por el equipo de Medusa. Node.js 22 podría tener comportamientos ligeramente distintos en módulos nativos.

**Impacto:** Potencial divergencia de comportamiento entre entornos. Dificultad para reproducir errores relacionados con la versión de Node.

**Corrección — crear `backend/.nvmrc`:**
```
20.19.0
```
O usar la versión 22 actual y documentarlo explícitamente.

---

### MEDIO-1 — `admin.backendUrl` — clave no verificada en v2.15.5

**Archivo:** `medusa-config.ts` (líneas 24–26)

```typescript
admin: {
  backendUrl: process.env.MEDUSA_BACKEND_URL,
},
```

En Medusa v2, la configuración del admin dashboard puede manejar `backendUrl` de distintas formas según la versión. En algunas versiones la clave correcta es `backend_url` (snake_case), en otras se configura únicamente mediante la variable de entorno `MEDUSA_BACKEND_URL` sin necesitar declaración en `defineConfig`. Si la clave es incorrecta, TypeScript con `skipLibCheck: true` no lo detectará.

**Impacto:** Posibles errores de CORS en el dashboard si la URL del backend no se configura correctamente. En desarrollo es poco probable que cause problemas, pero puede complicar el diagnóstico.

**Corrección:** Verificar en la documentación de `@medusajs/medusa@2.15.5` la clave exacta. Si no es necesaria, eliminarla y dejar que `MEDUSA_BACKEND_URL` funcione como variable de entorno directamente.

---

### MEDIO-2 — `moduleResolution: "Node"` deprecado en TypeScript 5

**Archivo:** `tsconfig.json` (línea 8)

```json
"moduleResolution": "Node"
```

En TypeScript 5, `"Node"` es el resolver legacy (pre-Node16). El resolver moderno es `"Bundler"`, `"Node16"` o `"NodeNext"`. El resolver legacy puede generar advertencias y no resuelve correctamente algunos patrones de importación de paquetes modernos con exportmap.

**Impacto:** Advertencias de TypeScript. Posibles fallos al resolver subpaths de paquetes que usen `exports` field en su package.json (como `@medusajs/framework/config` y `@medusajs/framework/http`).

**Corrección:** Cambiar a `"Bundler"` si Medusa lo admite (verificar). Como fallback conservador, `"Node16"` es más correcto que `"Node"` en TS5.

---

### MEDIO-3 — `@medusajs/admin-sdk` podría necesitar estar en `dependencies`

**Archivo:** `package.json`

`@medusajs/admin-sdk` está en `devDependencies`. En entornos de producción, el `npm install --production` excluye devDependencies. Si el proceso de build del admin dashboard (que ocurre durante `medusa build`) requiere `@medusajs/admin-sdk` en runtime del build, fallará en CI/CD.

**Impacto:** Fallo del build en producción. Riesgo bajo para Sprint 1 (no hay extensiones de admin), alto a partir de Sprint 2.

**Corrección:** Mover a `dependencies` cuando se implementen extensiones de admin en Sprint 2.

---

### MEDIO-4 — Archivo `src/scripts/seed.ts` no existe

**Archivo:** `package.json` (script `seed`), `README.md`

```json
"seed": "medusa exec ./src/scripts/seed.ts"
```

El script referencia un archivo que no existe. Ejecutar `npm run seed` falla inmediatamente.

**Impacto:** Error confuso en el primer intento de seed. Mínimo para Sprint 1, pero genera ruido.

**Corrección:** Crear un placeholder en `src/scripts/seed.ts` con comentario indicando que se implementa en Sprint 1 Fase 4, o eliminar el script del package.json hasta que se necesite.

---

### MEDIO-5 — Versiones con `^` en dependencias core

**Archivo:** `package.json`

```json
"@medusajs/medusa": "^2.15.5",
"@medusajs/dashboard": "^2.15.5"
```

El caret `^` permite actualizaciones automáticas a cualquier versión `2.x.x >= 2.15.5`. Para un framework en evolución activa como Medusa v2, un minor update podría introducir cambios breaking (especialmente en la API de módulos personalizados, que es el corazón del Sprint 2+).

**Impacto:** El comportamiento del proyecto puede cambiar entre entornos o al correr `npm install` en fechas distintas.

**Corrección:** Usar versiones exactas para los paquetes Medusa core:
```json
"@medusajs/medusa": "2.15.5",
"@medusajs/dashboard": "2.15.5",
"@medusajs/cli": "2.15.5",
"@medusajs/framework": "2.15.5"
```
Y gestionar actualizaciones explícitamente.

---

### MEDIO-6 — `STORE_CORS` apunta a `localhost:3000` pero el frontend no existe en Sprint 1

**Archivo:** `.env.example`

```
STORE_CORS=http://localhost:3000
```

En Sprint 1 no existe el frontend Next.js. El CORS de la store no tiene consumidor. No genera errores, pero documenta un origen que no existe todavía, lo cual puede confundir.

**Impacto:** Ninguno en Sprint 1. Puede generar CORS errors si se prueba el store API desde otro origen.

**Corrección:** Agregar nota en `.env.example` indicando que `STORE_CORS` aplica a partir del Sprint 6. Mientras tanto, se puede usar `http://localhost:9000` o una herramienta de prueba de API como Postman que no requiere CORS.

---

### BAJO-1 — Duplicación de entradas en `.gitignore`

**Archivo:** `.gitignore`

Las siguientes entradas aparecen dos veces:
- `.next/` — líneas en sección Builds y en sección Next.js
- `out/` — ídem
- `next-env.d.ts` — ídem
- `*.pgdump` — en sección Medusa y en sección PostgreSQL

**Impacto:** Ninguno funcional. Git ignora las duplicaciones. Reduce legibilidad.

**Corrección:** Consolidar en una sola sección por tema.

---

### BAJO-2 — Endpoint de health check no documentado

**Archivo:** `README.md`

Medusa v2 expone `GET /health` para verificar que el servidor está activo. Este endpoint es el primero que debe usarse para confirmar que el servidor levantó correctamente. No está mencionado en el README.

**Corrección:** Agregar en la sección de verificación:
```bash
curl http://localhost:9000/health
# Respuesta esperada: { "status": "ok" }
```

---

### BAJO-3 — `@types/node` en versión `^20` con Node.js 22 instalado

**Archivo:** `package.json`

```json
"@types/node": "^20"
```

El sistema usa Node.js 22. Los tipos `@types/node@^20` incluyen las APIs de Node.js 20 pero no las de Node.js 22. No es un error crítico (las APIs son mayormente retrocompatibles), pero puede generar advertencias si se usan APIs nuevas de Node.js 22.

**Corrección:** Alinear con la versión real de Node.js:
```json
"@types/node": "^22"
```

---

### BAJO-4 — `medusa-config.d.ts` no está en `.gitignore`

**Archivo:** `.gitignore`

Al compilar `medusa-config.ts`, TypeScript genera `medusa-config.js` y `medusa-config.d.ts`. El `.gitignore` excluye `medusa-config.js` pero no `medusa-config.d.ts`. El archivo de declaraciones compilado no debería versionarse si la fuente TypeScript ya está en el repo.

**Corrección:** Agregar al `.gitignore`:
```
medusa-config.d.ts
```

---

## Lo que está bien

Los siguientes aspectos son correctos y no requieren cambios:

- **Estructura de carpetas** — sigue exactamente las convenciones de Medusa v2: `src/admin/`, `src/api/`, `src/links/`, `src/modules/`, `src/subscribers/`, `src/workflows/`. La separación entre `src/api/store/` y `src/api/admin/` es correcta.
- **`@medusajs/cli` en devDependencies** — confirmado via npm: el binario `medusa` proviene exclusivamente de `@medusajs/cli`. Ponerlo en devDependencies es correcto.
- **`modules: []` vacío en medusa-config.ts** — correcto para Sprint 1. Los módulos nativos se cargan automáticamente sin registro explícito.
- **`defineConfig` y `loadEnv`** — importaciones y uso correctos para Medusa v2.
- **`pg: ^8.21.0`** — versión correcta del driver PostgreSQL.
- **`engines: { "node": ">=20.0.0" }`** — declaración correcta que documenta el requisito mínimo.
- **`.env.example` bien estructurado** — documentado por sección, con instrucciones claras y variables futuras comentadas.
- **`.gitignore` completo** — cubre Node.js, MedusaJS, Next.js, PostgreSQL, macOS, VS Code, JetBrains. Estructura con comentarios por sección es profesional.
- **`tsconfig.json` base** — opciones como `experimentalDecorators`, `emitDecoratorMetadata`, `skipLibCheck` y `strict: false` son correctas para Medusa v2 (MikroORM las requiere).
- **`private: true` en package.json** — correcto para evitar publicación accidental a npm.
- **`src/api/middlewares.ts`** — archivo requerido por Medusa v2 para el sistema de middlewares, correctamente inicializado.
- **`.gitkeep` en directorios vacíos** — preserva la estructura en el repositorio de forma profesional.

---

## Riesgos Identificados

### Riesgo Técnico A — Dependencia transitiva de ioredis
**Probabilidad:** Alta | **Impacto:** Alto

Medusa v2 usa ioredis internamente en su event bus. Sin declararlo explícitamente, el comportamiento de instalación depende de la versión de npm y del algoritmo de resolución de peer dependencies. En equipos o CI donde npm tenga configuración diferente, podría no instalarse.

### Riesgo Técnico B — Evolución de Medusa v2 con `^` en versiones
**Probabilidad:** Media | **Impacto:** Medio

Con `^2.15.5`, una actualización futura a `2.16.x` podría cambiar el comportamiento de la API de módulos, de los link modules, o del sistema de workflows. Esto podría romper código que funciona hoy.

### Riesgo Técnico C — Node.js 22 vs LTS 20
**Probabilidad:** Baja | **Impacto:** Medio

Node.js 22 es compatible con Medusa (`>= 20`), pero es una versión más nueva que el entorno más probado por la comunidad de Medusa. Algunos módulos nativos de Node.js tienen comportamientos diferentes entre versiones mayores.

### Riesgo Técnico D — PostgreSQL 15 permisos schema public
**Probabilidad:** Muy Alta | **Impacto:** Crítico

Sin los permisos correctos en el schema `public` de PostgreSQL 15, las migraciones fallarán en el primer intento. Es un error de ejecución garantizado con la configuración actual del README.

---

## Ajustes Sugeridos — Ordenados por Prioridad

| Prioridad | Archivo | Cambio |
|---|---|---|
| 1 | `package.json` | Agregar `ioredis: "^5.4.1"` a `dependencies` |
| 2 | `package.json` | Agregar `@medusajs/framework: "2.15.5"` a `dependencies` |
| 3 | `README.md` | Corregir comandos SQL para PostgreSQL 15 (schema public) |
| 4 | `package.json` | Usar versiones exactas en Medusa packages (sin `^`) |
| 5 | `README.md` | Corregir comando `medusa user` a sintaxis v2 completa |
| 6 | `package.json` | Corregir script `db:generate` para aceptar nombre de módulo |
| 7 | `README.md` | Aclarar limitación del script `db:create` |
| 8 | `medusa-config.ts` | Agregar fallback para `JWT_SECRET` y `COOKIE_SECRET` en desarrollo |
| 9 | `backend/` | Crear `.nvmrc` con versión de Node.js |
| 10 | `src/scripts/seed.ts` | Crear placeholder vacío para evitar error del script `seed` |
| 11 | `tsconfig.json` | Evaluar cambio de `moduleResolution` a `"Bundler"` |
| 12 | `README.md` | Agregar endpoint `GET /health` como primer paso de verificación |
| 13 | `.gitignore` | Eliminar entradas duplicadas |
| 14 | `.gitignore` | Agregar `medusa-config.d.ts` |
| 15 | `package.json` | Cambiar `@types/node` a `"^22"` |

---

## Checklist para Levantar el Proyecto

Realizar en este orden exacto. No avanzar si un paso falla.

### Paso 0 — Ajustes previos (antes de `npm install`)

- [ ] Aplicar todos los ajustes de Prioridad 1 al 10 de la tabla anterior
- [ ] Verificar que `.env` existe (crear desde `.env.example`)
- [ ] Generar secretos reales para `JWT_SECRET` y `COOKIE_SECRET`:
  ```bash
  openssl rand -base64 32
  ```
- [ ] Completar todos los valores en `.env` con datos reales

### Paso 1 — Verificar entorno

- [ ] `node --version` → debe ser `>= 20.0.0`
- [ ] `npm --version` → debe ser `>= 9`
- [ ] `psql --version` → debe ser `>= 15`
- [ ] PostgreSQL server activo: `pg_isready` o `psql -U postgres -c '\l'`

### Paso 2 — Instalar dependencias

- [ ] `cd backend && npm install`
- [ ] Verificar que no hay errores de peer dependencies en el output
- [ ] Verificar que `node_modules/.bin/medusa` existe

### Paso 3 — Configurar PostgreSQL

- [ ] Conectarse como superusuario: `psql -U postgres`
- [ ] Ejecutar script de creación de usuario y base de datos (con los comandos PG15 corregidos)
- [ ] Verificar conexión: `psql postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev`

### Paso 4 — Ejecutar migraciones

- [ ] `npm run db:migrate`
- [ ] Verificar en la consola que las migraciones corren sin errores
- [ ] Confirmar tablas creadas: conectarse a DB y ejecutar `\dt`

### Paso 5 — Crear usuario administrador

- [ ] Ejecutar el comando correcto de Medusa v2 (con flags `--email` y `--password`)
- [ ] Verificar que el usuario existe en la tabla correspondiente

### Paso 6 — Levantar servidor de desarrollo

- [ ] `npm run dev`
- [ ] Esperar mensaje de inicio exitoso en consola (Medusa tarda ~15-30 segundos)
- [ ] Verificar health check: `curl http://localhost:9000/health`
  - Respuesta esperada: `{"status":"ok"}`

### Paso 7 — Verificar panel administrativo

- [ ] Abrir `http://localhost:9000/app` en el navegador
- [ ] Hacer login con las credenciales del usuario admin creado
- [ ] Verificar que el dashboard carga correctamente

### Paso 8 — Smoke test de API

- [ ] `GET http://localhost:9000/store/products` → respuesta 200 (lista vacía)
- [ ] `GET http://localhost:9000/store/categories` → respuesta 200
- [ ] `POST http://localhost:9000/auth/user/emailpass` con credenciales admin → respuesta con token
- [ ] `GET http://localhost:9000/admin/products` con token → respuesta 200

### Paso 9 — Validación de criterio de aceptación Sprint 1

- [ ] Crear categoría desde el panel admin
- [ ] Crear producto con variante desde el panel admin
- [ ] Verificar producto en `GET /store/products`
- [ ] Crear carrito via `POST /store/carts`
- [ ] Agregar ítem al carrito
- [ ] Verificar que la estructura de módulos en `src/` está lista para Sprint 2

**Sprint 1 aprobado cuando todos los pasos anteriores están completados sin errores.**

---

## Notas

- Los ajustes descritos en este documento son correcciones a archivos de configuración, no a código de negocio. No introducen nueva funcionalidad.
- El criterio de no modificar el core de MedusaJS se mantiene. Ningún hallazgo requiere tocar el framework.
- Una vez aprobado este review, proceder con los ajustes en el siguiente orden: package.json → medusa-config.ts → README.md → .gitignore → archivos nuevos (.nvmrc, seed.ts placeholder).
