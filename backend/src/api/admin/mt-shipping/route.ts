import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { Pool } from "pg"

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

// GET /admin/mt-shipping/status — estado de la configuración
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  try {
    const [rulesRes, nativeRes, locationsRes, serviceZonesRes] = await Promise.all([
      pool.query(`SELECT id, name, is_active FROM mt_shipping_rule WHERE deleted_at IS NULL ORDER BY priority DESC`),
      pool.query(
        `SELECT so.id, so.name, so.provider_id, so.data, sz.name AS service_zone_name
         FROM   shipping_option so
         LEFT JOIN service_zone sz ON sz.id = so.service_zone_id
         WHERE  so.deleted_at IS NULL`
      ),
      pool.query(`SELECT id, name FROM stock_location WHERE deleted_at IS NULL`),
      pool.query(
        `SELECT sz.id, sz.name, fs.name AS fulfillment_set_name
         FROM   service_zone sz
         JOIN   fulfillment_set fs ON fs.id = sz.fulfillment_set_id
         WHERE  sz.deleted_at IS NULL`
      ),
    ])

    const rules = rulesRes.rows
    const nativeOptions = nativeRes.rows
    const mtOptions = nativeOptions.filter((o: { provider_id: string }) => o.provider_id?.includes("mt-fulfillment"))

    res.json({
      summary: {
        stock_locations: locationsRes.rows.length,
        service_zones: serviceZonesRes.rows.length,
        total_native_shipping_options: nativeOptions.length,
        mt_fulfillment_options: mtOptions.length,
        active_rules: rules.filter((r: { is_active: boolean }) => r.is_active).length,
        rules_with_medusa_option: rules.filter((r: { id: string }) =>
          mtOptions.some((o: { data?: { id?: string } }) => o.data?.id === r.id)
        ).length,
      },
      stock_locations: locationsRes.rows,
      service_zones: serviceZonesRes.rows,
      mt_shipping_rules: rules.map((r: { id: string; name: string; is_active: boolean }) => ({
        ...r,
        has_medusa_option: mtOptions.some((o: { data?: { id?: string } }) => o.data?.id === r.id),
      })),
    })
  } catch (err) {
    console.error("[mt-shipping GET]", err)
    res.status(500).json({ message: String(err) })
  }
}

// POST /admin/mt-shipping/setup
// Configura en Medusa: stock location → sales channel → fulfillment set →
// service zone (GT) → shipping option por cada regla activa
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const fulfillmentService = req.scope.resolve(Modules.FULFILLMENT)
    const stockLocationService = req.scope.resolve(Modules.STOCK_LOCATION)
    const salesChannelService = req.scope.resolve(Modules.SALES_CHANNEL)
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.LINK)

    const log: string[] = []

    // ── 1. Stock Location ────────────────────────────────────────────────────
    let stockLocations = await stockLocationService.listStockLocations({ name: "Guatemala" })
    let stockLocation = stockLocations[0]
    if (!stockLocation) {
      stockLocation = await stockLocationService.createStockLocations({ name: "Guatemala" })
      log.push("Creado stock location: Guatemala")
    } else {
      log.push(`Stock location existente: ${stockLocation.id}`)
    }

    // ── 2. Sales Channel ─────────────────────────────────────────────────────
    const salesChannels = await salesChannelService.listSalesChannels({})
    const salesChannel = salesChannels[0]
    if (!salesChannel) throw new Error("No hay Sales Channel configurado en Medusa")
    log.push(`Sales channel: ${salesChannel.name} (${salesChannel.id})`)

    // ── 3. Link SalesChannel ↔ StockLocation ─────────────────────────────────
    try {
      await remoteLink.create([
        {
          [Modules.SALES_CHANNEL]: { sales_channel_id: salesChannel.id },
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
        },
      ])
      log.push("Vinculado Sales Channel → Stock Location")
    } catch {
      log.push("Link Sales Channel ↔ Stock Location ya existía")
    }

    // ── 4. Fulfillment Set ───────────────────────────────────────────────────
    let fulfillmentSets = await fulfillmentService.listFulfillmentSets({ name: "MiTienda Envíos" })
    let fulfillmentSet = fulfillmentSets[0]
    if (!fulfillmentSet) {
      fulfillmentSet = await fulfillmentService.createFulfillmentSets({
        name: "MiTienda Envíos",
        type: "shipping",
      })
      log.push("Creado fulfillment set: MiTienda Envíos")
    } else {
      log.push(`Fulfillment set existente: ${fulfillmentSet.id}`)
    }

    // ── 5. Link StockLocation ↔ FulfillmentSet ───────────────────────────────
    try {
      await remoteLink.create([
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
          [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
        },
      ])
      log.push("Vinculado Stock Location → Fulfillment Set")
    } catch {
      log.push("Link Stock Location ↔ Fulfillment Set ya existía")
    }

    // ── 6. Service Zone ──────────────────────────────────────────────────────
    // FilterableServiceZoneProps usa "fulfillment_set" (relación), no "fulfillment_set_id"
    let serviceZones = await fulfillmentService.listServiceZones({
      fulfillment_set: { id: fulfillmentSet.id },
    })
    let serviceZone = serviceZones[0]
    if (!serviceZone) {
      serviceZone = await fulfillmentService.createServiceZones({
        name: "Guatemala",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [{ type: "country", country_code: "gt" }],
      })
      log.push("Creado service zone: Guatemala (GT)")
    } else {
      log.push(`Service zone existente: ${serviceZone.id}`)
    }

    // ── 7. Shipping Profile ──────────────────────────────────────────────────
    let shippingProfiles = await fulfillmentService.listShippingProfiles({ type: "default" })
    let shippingProfile = shippingProfiles[0]
    if (!shippingProfile) {
      shippingProfile = await fulfillmentService.createShippingProfiles({
        name: "Default",
        type: "default",
      })
      log.push("Creado shipping profile: Default")
    } else {
      log.push(`Shipping profile existente: ${shippingProfile.id}`)
    }

    // ── 8. Provider ID (via DB — el filtro del servicio no acepta provider_id) ──
    const { rows: providerRows } = await pool.query(
      `SELECT id FROM fulfillment_provider WHERE id LIKE '%mt-fulfillment%' LIMIT 1`
    )
    const providerId = providerRows[0]?.id
    if (!providerId) {
      throw new Error("Provider mt-fulfillment no encontrado. Verifica que el backend esté deployado correctamente.")
    }
    log.push(`Provider encontrado: ${providerId}`)

    // ── 9. Reglas activas ────────────────────────────────────────────────────
    const { rows: rules } = await pool.query(
      `SELECT id, name FROM mt_shipping_rule WHERE is_active = true AND deleted_at IS NULL ORDER BY priority DESC`
    )
    log.push(`Reglas activas: ${rules.length}`)

    // ── 10. Eliminar shipping options anteriores del provider ─────────────────
    const { rows: existingOptionRows } = await pool.query(
      `SELECT id FROM shipping_option WHERE provider_id = $1 AND deleted_at IS NULL`,
      [providerId]
    )
    if (existingOptionRows.length > 0) {
      await fulfillmentService.deleteShippingOptions(existingOptionRows.map((r: { id: string }) => r.id))
      log.push(`Eliminadas ${existingOptionRows.length} opciones anteriores`)
    }

    // ── 11. Crear shipping options nuevas ─────────────────────────────────────
    const created: string[] = []
    for (const rule of rules as { id: string; name: string }[]) {
      await fulfillmentService.createShippingOptions({
        name: rule.name,
        provider_id: providerId,
        service_zone_id: serviceZone.id,
        shipping_profile_id: shippingProfile.id,
        price_type: "calculated",
        type: { label: rule.name, description: "Calculado por regla de envío", code: rule.id },
        rules: [],
        data: { id: rule.id },
      })
      created.push(rule.name)
    }
    log.push(`Creadas ${created.length} shipping options: ${created.join(", ")}`)

    res.json({ success: true, log })
  } catch (err) {
    console.error("[mt-shipping POST setup]", err)
    res.status(500).json({
      success: false,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
