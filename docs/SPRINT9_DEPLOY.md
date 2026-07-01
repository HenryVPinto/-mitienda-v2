# Sprint 9 — Deploy a Producción

## Objetivo
Poner en producción el backend (Railway) y el frontend (Vercel).

---

## Backend — Railway

### Problemas resueltos

| Problema | Causa raíz | Fix aplicado |
|---|---|---|
| `medusa: not found` | `@medusajs/cli` estaba en `devDependencies` | Movido a `dependencies` + `--include=dev` en nixpacks install |
| Build OOM | TypeScript sin límite de heap | `NODE_OPTIONS='--max-old-space-size=4096'` en nixpacks build |
| `redisUrl not found` | Faltaba `projectConfig.redisUrl` | Añadido en `medusa-config.ts` (commit `0aec952`) |
| Admin compilado en build | `MEDUSA_ADMIN_DISABLE=true` no llegaba al build phase | Explicitado en nixpacks + `admin.disable: true` en config (commit `6f198dd`) |

### Bloqueante actual — OOM en startup

**Síntoma:** El proceso recibe `Killed` ~3 segundos después de "Database already up-to-date". El servidor nunca termina de iniciar.

**Causa:** Railway plan actual tiene límite de **1 GB RAM**. Medusa v2 con 9+ módulos (3 Redis + 6 custom + 19 built-in) necesita ~1.2–1.5 GB en el pico de startup.

**Solución pendiente:**
1. Ir a [railway.app](https://railway.app) → Billing → upgrade a **Hobby ($5/mes)**
2. En el servicio backend → Settings → Resources → subir RAM a **2 GB**
3. Railway redeploya automáticamente

### Configuración actual de memoria (nixpacks.toml)
```toml
[phases.build]
cmds = ["MEDUSA_ADMIN_DISABLE=true NODE_OPTIONS='--max-old-space-size=4096' npm run build"]

[start]
cmd = "NODE_OPTIONS='--max-old-space-size=640 --max-semi-space-size=32' npm run start"
```
Railway Variable `NODE_OPTIONS='--max-old-space-size=640 --max-semi-space-size=32'` también configurada.

### Pasos pendientes tras resolver OOM

```bash
# Crear usuario admin (ejecutar desde Railway → backend → Shell o como one-off command)
npx medusa user -e admin@mitienda.com -p Admin1234! -f Admin -l MiTienda
```

---

## Frontend — Vercel

**Estado: Desplegado (preview). Integración Git en configuración.**

Variables de entorno configuradas en Vercel:
- `NEXT_PUBLIC_MEDUSA_URL` → `https://-mitienda-v2.railway.app`
- `NEXT_PUBLIC_PUBLISHABLE_KEY` → `pk_a70601...` (ver Railway shell)

Integración Git: GitHub (`HenryVPinto/-mitienda-v2`) → Root Directory: `frontend/`

---

## Git remotes

- `origin` → GitLab (hvicente/mitienda-v2.git) — remote principal
- `github` → GitHub (HenryVPinto/-mitienda-v2.git) — espejo, conectado a Railway

Push siempre a ambos:
```bash
git push origin main && git push github main
```
