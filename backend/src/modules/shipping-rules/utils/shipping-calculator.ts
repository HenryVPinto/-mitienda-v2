// ─────────────────────────────────────────────────────────────────────────────
// Shipping Calculator — fuente única de verdad para el cálculo de envíos.
//
// Tanto el storefront (store/mt-shipping-options) como el fulfillment provider
// (mt-fulfillment) importan desde aquí. Cualquier cambio en la lógica de
// negocio se hace en este archivo y se refleja en ambos consumidores.
//
// Activar logs: SHIPPING_CALCULATOR_DEBUG=true en las variables de entorno.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ───────────────────────────────────────────────────────────────────

export type ShippingRuleData = {
  id: string
  name: string
  flat_rate: number | null           // centavos en DB (ej. Q35 → 3500)
  free_above_amount: number | null   // centavos en DB (ej. Q350 → 35000)
  min_order_amount: number | null    // centavos en DB
  max_order_amount: number | null    // centavos en DB
  weight_threshold_lbs: number | null
  rate_per_lb: number | null         // quetzales en DB (ej. Q1.50 → 1.5)
  min_item_quantity: number | null
  priority: number
  metadata?: Record<string, unknown> | null
}

export type CartItemWeight = {
  weightRaw: number    // valor bruto tal como está en la DB del producto
  weightUnit: string   // unidad configurada en product.metadata.weight_unit: "g" | "kg" | "lb" | "lbs" | "oz"
  quantity: number
  variantId?: string   // para logs de diagnóstico
}

export type ShippingContext = {
  cartTotalQ: number      // subtotal del carrito en QUETZALES (no centavos)
  totalItems: number      // cantidad total de artículos
  totalWeightLbs: number  // peso total ya convertido a libras
  isWholesaleCart?: boolean // true si algún item tiene tier_rules activos → nunca envío gratis
}

export type ShippingDebugInfo = {
  subtotalQ: number
  totalItems: number
  totalWeightLbs: number
  ruleId: string
  ruleName: string
  ruleType: string
  thresholdLbs: number | null
  extraLbs: number | null
  flatRateQ: number
  freeThresholdQ: number | null
  additionalCostQ: number
  totalAmountQ: number
  triggeredBy: "weight" | "count" | "standard-free" | "standard-flat" | null
}

// ─── Constantes ──────────────────────────────────────────────────────────────

export const TO_LBS: Record<string, number> = {
  lb: 1,
  lbs: 1,
  g: 1 / 453.592,
  kg: 2.20462,
  oz: 0.0625,
}

// ─── Interfaz de Evaluador (extensibilidad) ───────────────────────────────────
//
// Para agregar un nuevo tipo de envío (express, pickup, zona, departamento):
//   1. Implementar esta interfaz.
//   2. Llamar registerEvaluator(miEvaluador) al iniciar el servidor.
//   Los evaluadores registrados tienen prioridad sobre los built-in.

export interface RuleEvaluator {
  /** Identificador único del tipo de regla (ej. "wholesale", "express", "pickup") */
  readonly type: string
  /** Retorna true si este evaluador es responsable de calcular esta regla */
  handles(rule: ShippingRuleData): boolean
  /** Retorna true si esta regla aplica al carrito actual */
  applies(rule: ShippingRuleData, context: ShippingContext): boolean
  /** Calcula el monto de envío en quetzales y metadatos de debug */
  calculate(
    rule: ShippingRuleData,
    context: ShippingContext
  ): { amountQ: number; partial: Partial<ShippingDebugInfo> }
}

// ─── Evaluador de Mayoreo (peso / cantidad) ───────────────────────────────────

const wholesaleEvaluator: RuleEvaluator = {
  type: "wholesale",

  handles(rule) {
    return rule.weight_threshold_lbs != null && rule.rate_per_lb != null
  },

  applies(rule, context) {
    const byWeight = context.totalWeightLbs > (rule.weight_threshold_lbs as number)
    const byCount =
      rule.min_item_quantity != null &&
      rule.min_item_quantity > 1 &&
      context.totalItems >= rule.min_item_quantity
    return byWeight || byCount
  },

  calculate(rule, context) {
    const flatRateQ = (rule.flat_rate ?? 0) / 100
    const threshold = rule.weight_threshold_lbs as number
    const ratePerLb = rule.rate_per_lb as number

    if (context.totalWeightLbs > threshold) {
      const extraLbs = context.totalWeightLbs - threshold
      const additionalCostQ = Math.round(extraLbs * ratePerLb * 100) / 100
      return {
        amountQ: flatRateQ + additionalCostQ,
        partial: {
          ruleType: "wholesale",
          thresholdLbs: threshold,
          extraLbs,
          flatRateQ,
          additionalCostQ,
          triggeredBy: "weight",
        },
      }
    }

    // Mayoreo activado por cantidad, pero peso bajo el umbral: tarifa fija. NUNCA gratis.
    return {
      amountQ: flatRateQ,
      partial: {
        ruleType: "wholesale",
        thresholdLbs: threshold,
        extraLbs: 0,
        flatRateQ,
        additionalCostQ: 0,
        triggeredBy: "count",
      },
    }
  },
}

// ─── Evaluador Estándar (tarifa fija / envío gratis) ─────────────────────────

const standardEvaluator: RuleEvaluator = {
  type: "standard",

  handles(_rule) {
    return true // fallback: maneja cualquier regla que ningún otro evaluador maneje
  },

  applies(_rule, _context) {
    return true
  },

  calculate(rule, context) {
    const flatRateQ = (rule.flat_rate ?? 0) / 100
    const freeThresholdQ =
      rule.free_above_amount != null ? rule.free_above_amount / 100 : null
    const isFree = !context.isWholesaleCart &&
      freeThresholdQ != null &&
      context.cartTotalQ >= freeThresholdQ
    const amountQ = isFree ? 0 : flatRateQ

    return {
      amountQ,
      partial: {
        ruleType: "standard",
        thresholdLbs: null,
        extraLbs: null,
        flatRateQ,
        freeThresholdQ,
        additionalCostQ: 0,
        triggeredBy: isFree ? "standard-free" : "standard-flat",
      },
    }
  },
}

// ─── Registro de Evaluadores ──────────────────────────────────────────────────

// El orden importa: el primer evaluador cuyo handles() retorne true gana.
// Los evaluadores personalizados (registerEvaluator) se insertan al inicio.
const EVALUATORS: RuleEvaluator[] = [wholesaleEvaluator, standardEvaluator]

function getEvaluator(rule: ShippingRuleData): RuleEvaluator {
  return EVALUATORS.find((e) => e.handles(rule)) ?? standardEvaluator
}

// ─── Debug Logger ─────────────────────────────────────────────────────────────

function debugLog(info: ShippingDebugInfo): void {
  if (process.env.SHIPPING_CALCULATOR_DEBUG !== "true") return
  console.info(
    "[shipping-calculator]",
    JSON.stringify(
      {
        subtotalQ:       info.subtotalQ,
        totalItems:      info.totalItems,
        totalWeightLbs:  +info.totalWeightLbs.toFixed(4),
        ruleId:          info.ruleId,
        ruleName:        info.ruleName,
        ruleType:        info.ruleType,
        triggeredBy:     info.triggeredBy,
        thresholdLbs:    info.thresholdLbs,
        extraLbs:        info.extraLbs != null ? +info.extraLbs.toFixed(4) : null,
        flatRateQ:       info.flatRateQ,
        freeThresholdQ:  info.freeThresholdQ,
        additionalCostQ: info.additionalCostQ,
        totalAmountQ:    info.totalAmountQ,
      },
      null,
      2
    )
  )
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Calcula el peso total del carrito en libras.
 * Respeta la unidad configurada en product.metadata.weight_unit por cada producto.
 * Emite console.warn si algún artículo tiene peso 0 o null.
 */
export function calcTotalWeightLbs(items: CartItemWeight[]): number {
  for (const item of items) {
    if (!item.weightRaw) {
      console.warn(
        `[shipping-calculator] variant ${item.variantId ?? "?"} tiene peso 0 o null — no contribuye al cálculo por peso`
      )
    }
  }
  return items.reduce((sum, item) => {
    const factor = TO_LBS[item.weightUnit] ?? TO_LBS["g"]
    return sum + item.weightRaw * factor * item.quantity
  }, 0)
}

/**
 * Selecciona las reglas de envío aplicables al carrito con lógica exclusiva:
 *   - Si una regla de mayoreo aplica → retorna solo esa regla (bloquea las estándar).
 *   - Si no hay mayoreo → retorna todas las reglas estándar aplicables.
 *
 * Las reglas deben venir ordenadas por priority DESC desde la DB.
 */
export function selectApplicableRules(
  rules: ShippingRuleData[],
  context: ShippingContext
): ShippingRuleData[] {
  const wholesaleRule = rules.find((rule) => {
    const ev = getEvaluator(rule)
    return ev.type === "wholesale" && ev.applies(rule, context)
  })

  if (wholesaleRule) return [wholesaleRule]

  return rules.filter((rule) => {
    const ev = getEvaluator(rule)
    return ev.type !== "wholesale" && ev.applies(rule, context)
  })
}

/**
 * Calcula el monto de envío para una regla específica en quetzales.
 * Si SHIPPING_CALCULATOR_DEBUG=true, registra el desglose completo del cálculo.
 */
export function calcShippingAmount(
  rule: ShippingRuleData,
  context: ShippingContext
): number {
  const evaluator = getEvaluator(rule)
  const { amountQ, partial } = evaluator.calculate(rule, context)

  const debugInfo: ShippingDebugInfo = {
    subtotalQ:       context.cartTotalQ,
    totalItems:      context.totalItems,
    totalWeightLbs:  context.totalWeightLbs,
    ruleId:          rule.id,
    ruleName:        rule.name,
    ruleType:        evaluator.type,
    thresholdLbs:    null,
    extraLbs:        null,
    flatRateQ:       (rule.flat_rate ?? 0) / 100,
    freeThresholdQ:  rule.free_above_amount != null ? rule.free_above_amount / 100 : null,
    additionalCostQ: 0,
    totalAmountQ:    amountQ,
    triggeredBy:     null,
    ...partial,
  }
  debugInfo.totalAmountQ = amountQ

  debugLog(debugInfo)

  return amountQ
}

/**
 * Registra un evaluador personalizado con la mayor prioridad.
 * Llamar durante la inicialización del servidor, antes del primer request.
 *
 * Ejemplo — envío express:
 *   registerEvaluator({
 *     type: "express",
 *     handles:   (rule) => rule.metadata?.is_express === true,
 *     applies:   (_rule, _ctx) => true,
 *     calculate: (rule, _ctx) => ({
 *       amountQ:  (rule.flat_rate ?? 0) / 100 + 50,
 *       partial:  { ruleType: "express", additionalCostQ: 50 },
 *     }),
 *   })
 */
export function registerEvaluator(evaluator: RuleEvaluator): void {
  EVALUATORS.unshift(evaluator)
}
