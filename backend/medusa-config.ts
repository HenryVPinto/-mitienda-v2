import { defineConfig, loadEnv, Modules } from "@medusajs/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

console.log("[medusa-config] NODE_ENV:", process.env.NODE_ENV)
console.log("[medusa-config] REDIS_URL:", process.env.REDIS_URL ? "SET (" + process.env.REDIS_URL.substring(0, 20) + "...)" : "NOT SET")

export default defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,

    // Opciones adicionales del driver PostgreSQL.
    // Descomentar en producción si el proveedor requiere SSL.
    // databaseDriverOptions: {
    //   ssl: { rejectUnauthorized: false },
    // },

    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      // En producción JWT_SECRET y COOKIE_SECRET deben estar en las variables de entorno.
      // El fallback solo es válido en desarrollo local. Nunca usar en producción.
      jwtSecret: process.env.JWT_SECRET || "dev-only-insecure-do-not-use-in-production",
      cookieSecret: process.env.COOKIE_SECRET || "dev-only-insecure-do-not-use-in-production",
    },
  },

  admin: {
    backendUrl: process.env.MEDUSA_BACKEND_URL,
  },

  modules: [
    // ── Redis: Cache ──────────────────────────────────────────
    {
      key: Modules.CACHE,
      resolve: "@medusajs/cache-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
        ttl: 30,
      },
    },
    // ── Redis: Event Bus ──────────────────────────────────────
    {
      key: Modules.EVENT_BUS,
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    // ── Redis: Workflow Engine ────────────────────────────────
    {
      key: Modules.WORKFLOW_ENGINE,
      resolve: "@medusajs/workflow-engine-redis",
      options: {
        redisUrl: process.env.REDIS_URL,
      },
    },
    // ── Módulos custom MiTienda ───────────────────────────────
    {
      resolve: "./src/modules/brand",
      options: {},
    },
    {
      resolve: "./src/modules/vendor",
      options: {},
    },
    {
      resolve: "./src/modules/shipping-rules",
      options: {},
    },
    {
      resolve: "./src/modules/product-extension",
      options: {},
    },
    {
      resolve: "./src/modules/promotion-engine",
      options: {},
    },
    {
      resolve: "./src/modules/cms",
      options: {},
    },
  ],
})
