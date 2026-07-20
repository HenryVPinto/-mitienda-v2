import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /admin/mt-shipping/status
// Muestra el estado de la configuración de envío de Medusa vs nuestras reglas
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const [rulesRes, nativeRes, locationsRes, serviceZonesRes] = await Promise.all([
      pool.query(
        `SELECT id, name, is_active FROM mt_shipping_rule WHERE deleted_at IS NULL ORDER BY priority DESC`
      ),
      pool.query(
        `SELECT so.id, so.name, so.provider_id, so.data, sz.name AS service_zone_name
         FROM   shipping_option so
         LEFT JOIN service_zone sz ON sz.id = so.service_zone_id
         WHERE  so.deleted_at IS NULL`
      ),
      pool.query(
        `SELECT id, name FROM stock_location WHERE deleted_at IS NULL`
      ),
      pool.query(
        `SELECT sz.id, sz.name, fs.name AS fulfillment_set_name
         FROM   service_zone sz
         JOIN   fulfillment_set fs ON fs.id = sz.fulfillment_set_id
         WHERE  sz.deleted_at IS NULL`
      ),
    ])

    const rules = rulesRes.rows
    const nativeOptions = nativeRes.rows
    const locations = locationsRes.rows
    const serviceZones = serviceZonesRes.rows

    const mtOptions = nativeOptions.filter((o: { provider_id: string }) =>
      o.provider_id?.includes("mt-fulfillment")
    )

    const rulesCoveredByMedusa = rules.filter((r: { id: string }) =>
      mtOptions.some((o: { data?: { id?: string } }) => o.data?.id === r.id)
    )

    res.json({
      summary: {
        stock_locations: locations.length,
        service_zones: serviceZones.length,
        total_native_shipping_options: nativeOptions.length,
        mt_fulfillment_options: mtOptions.length,
        active_rules: rules.filter((r: { is_active: boolean }) => r.is_active).length,
        rules_with_medusa_option: rulesCoveredByMedusa.length,
      },
      stock_locations: locations,
      service_zones: serviceZones,
      mt_shipping_rules: rules.map((r: { id: string; name: string; is_active: boolean }) => ({
        ...r,
        has_medusa_option: mtOptions.some(
          (o: { data?: { id?: string } }) => o.data?.id === r.id
        ),
      })),
      native_shipping_options: nativeOptions,
    })
  } catch (err) {
    console.error("[mt-shipping GET status]", err)
    res.status(500).json({ message: String(err) })
  }
}
