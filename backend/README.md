# MiTienda Backend

Backend headless ecommerce basado en MedusaJS v2 con PostgreSQL.

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20 LTS |
| npm | 9+ |
| PostgreSQL | 15+ |

Verificar versiones instaladas:

```bash
node --version
npm --version
psql --version
```

---

## Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores reales. Ver la sección [Variables de Entorno](#variables-de-entorno).

### 3. Crear la base de datos

Conectarse a PostgreSQL y ejecutar:

```sql
CREATE USER mitienda_user WITH PASSWORD 'mitienda_pass';
CREATE DATABASE mitienda_dev OWNER mitienda_user;
GRANT ALL PRIVILEGES ON DATABASE mitienda_dev TO mitienda_user;
```

Conectarse a la nueva base de datos y otorgar permisos sobre el schema público (requerido en PostgreSQL 15+):

```sql
\c mitienda_dev
GRANT ALL ON SCHEMA public TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO mitienda_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO mitienda_user;
```

> **PostgreSQL 15+:** El comando `GRANT ALL PRIVILEGES ON DATABASE` ya no otorga permisos sobre el schema `public`. Los tres comandos adicionales son obligatorios o las migraciones fallarán con `permission denied for schema public`.

Verificar conexión:

```bash
psql postgres://mitienda_user:mitienda_pass@localhost:5432/mitienda_dev
```

### 4. Ejecutar migraciones

```bash
npm run db:migrate
```

### 5. Crear usuario administrador

```bash
npx medusa user --email admin@mitienda.com --password "password_seguro"
```

### 6. Iniciar servidor de desarrollo

```bash
npm run dev
```

El servidor estará disponible en:

- **API**: `http://localhost:9000`
- **Panel admin**: `http://localhost:9000/app`

---

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compilar para producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run db:migrate` | Ejecutar migraciones pendientes |
| `npm run db:generate -- <modulo>` | Generar nueva migración para un módulo propio |
| `npm run db:rollback` | Revertir la última migración |
| `npm run seed` | Ejecutar script de datos iniciales |

> **Nota:** La base de datos debe crearse manualmente con comandos SQL directos (ver sección Instalación). No existe un script automatizado para la creación inicial de la base de datos.
>
> **Uso de `db:generate`:** requiere el nombre del módulo como argumento. Ejemplo: `npm run db:generate -- brand`

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgres://user:pass@localhost:5432/mitienda_dev` |
| `JWT_SECRET` | Secreto para firma de tokens JWT | Cadena aleatoria segura |
| `COOKIE_SECRET` | Secreto para firma de cookies | Cadena aleatoria segura |
| `STORE_CORS` | Origen permitido para la tienda | `http://localhost:3000` |
| `ADMIN_CORS` | Origen permitido para el admin | `http://localhost:9000` |
| `AUTH_CORS` | Orígenes permitidos para auth | `http://localhost:3000,http://localhost:9000` |
| `MEDUSA_BACKEND_URL` | URL base del servidor Medusa | `http://localhost:9000` |

Para generar secretos seguros:

```bash
openssl rand -base64 32
```

---

## API

### Endpoints Store (público)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/store/products` | Listar productos |
| GET | `/store/products/:id` | Detalle de producto |
| GET | `/store/collections` | Listar colecciones |
| GET | `/store/categories` | Listar categorías |
| POST | `/store/carts` | Crear carrito |
| POST | `/store/carts/:id/line-items` | Agregar ítem al carrito |
| POST | `/store/carts/:id/complete` | Completar checkout |
| GET | `/store/orders/:id` | Detalle de orden |
| POST | `/auth/customer/emailpass/register` | Registro de cliente |
| POST | `/auth/customer/emailpass` | Login de cliente |

### Endpoints Admin (requiere autenticación)

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/admin/products` | Listar productos |
| POST | `/admin/products` | Crear producto |
| GET | `/admin/orders` | Listar órdenes |
| GET | `/admin/customers` | Listar clientes |
| GET | `/admin/inventory-items` | Listar inventario |

Autenticación admin:

```bash
POST /auth/user/emailpass
{
  "email": "admin@mitienda.com",
  "password": "password_seguro"
}
```

---

## Estructura del Proyecto

```
backend/
├── src/
│   ├── admin/          # Extensiones del panel administrativo (Sprint 2+)
│   ├── api/            # Endpoints HTTP personalizados (Sprint 2+)
│   │   └── middlewares.ts
│   ├── jobs/           # Tareas programadas (Sprint futuro)
│   ├── links/          # Vínculos entre módulos (Sprint 2+)
│   ├── modules/        # Módulos personalizados de MiTienda
│   │   ├── brand/           (Sprint 2)
│   │   ├── vendor/          (Sprint 2-3)
│   │   ├── cms/             (Sprint 5)
│   │   ├── promotion-engine/ (Sprint 4)
│   │   └── shipping-rules/  (Sprint 2)
│   ├── scripts/        # Scripts de seed y utilidades
│   ├── subscribers/    # Suscriptores de eventos (Sprint futuro)
│   └── workflows/      # Workflows de negocio (Sprint 4+)
├── .env.example        # Plantilla de variables de entorno
├── medusa-config.ts    # Configuración principal de Medusa
├── package.json
└── tsconfig.json
```

---

## Entornos de Base de Datos

| Entorno | Base de datos |
|---|---|
| Desarrollo | `mitienda_dev` |
| Test | `mitienda_test` |
| Producción | `mitienda_prod` |

Cambiar el entorno modificando `DATABASE_URL` en `.env`.

---

## Convenciones

- Todas las tablas propias usan prefijo `mt_` (ejemplo: `mt_brand`, `mt_vendor`).
- Nunca modificar el núcleo de MedusaJS.
- Toda personalización se implementa mediante módulos en `src/modules/`.
- Las migraciones se versionan junto con el código fuente.
- Nunca modificar migraciones ya ejecutadas en producción.

---

## Próximos Pasos

Ver `docs/ROADMAP.md` y `docs/BACKEND_PLAN.md` para el detalle completo de sprints y módulos planificados.
