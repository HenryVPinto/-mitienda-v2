/**
 * Pruebas del ShippingCalculator.
 * Ejecutar: node --require ts-node/register src/modules/shipping-rules/utils/shipping-calculator.test.ts
 */

import {
  calcTotalWeightLbs,
  calcShippingAmount,
  selectApplicableRules,
  type ShippingRuleData,
  type CartItemWeight,
  type ShippingContext,
} from "./shipping-calculator"

// ─── Helpers ─────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0

function assert(label: string, actual: number, expected: number, tolerance = 0.001) {
  const ok = Math.abs(actual - expected) <= tolerance
  if (ok) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    console.error(`      actual:   ${actual}`)
    console.error(`      expected: ${expected}`)
    failed++
  }
}

function assertBool(label: string, actual: boolean, expected: boolean) {
  const ok = actual === expected
  if (ok) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}`)
    console.error(`      actual:   ${actual}`)
    console.error(`      expected: ${expected}`)
    failed++
  }
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const wholesaleRule: ShippingRuleData = {
  id: "rule-wholesale",
  name: "Mayoreo",
  flat_rate: 0,
  free_above_amount: null,
  min_order_amount: null,
  max_order_amount: null,
  weight_threshold_lbs: 10,
  rate_per_lb: 1.5,
  min_item_quantity: 3,
  priority: 2,
}

const standardRule: ShippingRuleData = {
  id: "rule-standard",
  name: "Envío estándar",
  flat_rate: 3500,          // Q35 en centavos
  free_above_amount: 35000, // Q350 en centavos
  min_order_amount: null,
  max_order_amount: null,
  weight_threshold_lbs: null,
  rate_per_lb: null,
  min_item_quantity: null,
  priority: 1,
}

// ─── 1. calcTotalWeightLbs ────────────────────────────────────────────────────

console.log("\n=== calcTotalWeightLbs ===")

assert(
  "3 lámparas × 4082g cada una = 27 lbs",
  calcTotalWeightLbs([{ weightRaw: 4082, weightUnit: "g", quantity: 3 }]),
  27.0,
  0.05
)

assert(
  "3 lámparas × 9 lb cada una = 27 lbs",
  calcTotalWeightLbs([{ weightRaw: 9, weightUnit: "lb", quantity: 3 }]),
  27.0,
  0.001
)

assert(
  "2 cajas × 2 kg cada una = 8.818 lbs",
  calcTotalWeightLbs([{ weightRaw: 2, weightUnit: "kg", quantity: 2 }]),
  8.818,
  0.01
)

assert(
  "productos mixtos: 1 × 4082g + 1 × 4 lb",
  calcTotalWeightLbs([
    { weightRaw: 4082, weightUnit: "g",  quantity: 1 },
    { weightRaw: 4,    weightUnit: "lb", quantity: 1 },
  ]),
  13.0,
  0.05
)

assert(
  "peso 0 → contribuye 0 al total",
  calcTotalWeightLbs([{ weightRaw: 0, weightUnit: "g", quantity: 5, variantId: "test-zero" }]),
  0,
  0.001
)

// ─── 2. calcShippingAmount — mayoreo por peso ─────────────────────────────────

console.log("\n=== calcShippingAmount — mayoreo (libras adicionales) ===")

function makeWholesaleCtx(totalWeightLbs: number, totalItems = 3): ShippingContext {
  return { cartTotalQ: 1497, totalItems, totalWeightLbs }
}

assert("8 lbs  → tarifa base (Q0)",          calcShippingAmount(wholesaleRule, makeWholesaleCtx(8)),   0)
assert("10 lbs → tarifa base (Q0, exacto)",  calcShippingAmount(wholesaleRule, makeWholesaleCtx(10)),  0)
assert("11 lbs → Q1.50",                     calcShippingAmount(wholesaleRule, makeWholesaleCtx(11)),  1.50)
assert("12.5 lbs → Q3.75",                  calcShippingAmount(wholesaleRule, makeWholesaleCtx(12.5)), 3.75)
assert("20 lbs → Q15.00",                   calcShippingAmount(wholesaleRule, makeWholesaleCtx(20)),   15.00)
assert("27 lbs → Q25.50 (3 lámparas)",      calcShippingAmount(wholesaleRule, makeWholesaleCtx(27)),   25.50)

// ─── 3. calcShippingAmount — mayoreo NUNCA gratis ─────────────────────────────

console.log("\n=== calcShippingAmount — mayoreo nunca gratis ===")

const highSubtotalCtx: ShippingContext = { cartTotalQ: 5000, totalItems: 15, totalWeightLbs: 5 }
assert(
  "mayoreo + subtotal Q5000 + peso bajo umbral → tarifa base (no gratis)",
  calcShippingAmount(wholesaleRule, highSubtotalCtx),
  0  // flat_rate de wholesaleRule es Q0; si fuera Q35 sería 35
)

// ─── 4. calcShippingAmount — estándar ────────────────────────────────────────

console.log("\n=== calcShippingAmount — estándar ===")

assert(
  "subtotal Q200 → Q35 (tarifa fija)",
  calcShippingAmount(standardRule, { cartTotalQ: 200, totalItems: 1, totalWeightLbs: 0.5 }),
  35
)

assert(
  "subtotal Q350 → Q0 (envío gratis, exacto en umbral)",
  calcShippingAmount(standardRule, { cartTotalQ: 350, totalItems: 1, totalWeightLbs: 0.5 }),
  0
)

assert(
  "subtotal Q500 → Q0 (envío gratis, sobre umbral)",
  calcShippingAmount(standardRule, { cartTotalQ: 500, totalItems: 1, totalWeightLbs: 0.5 }),
  0
)

// ─── 5. selectApplicableRules — exclusividad ──────────────────────────────────

console.log("\n=== selectApplicableRules — exclusividad ===")

const rules = [wholesaleRule, standardRule]

const wholesaleByWeight = selectApplicableRules(rules, { cartTotalQ: 1497, totalItems: 2, totalWeightLbs: 15 })
assertBool("peso 15 lbs → solo mayoreo (1 regla)",      wholesaleByWeight.length === 1, true)
assertBool("peso 15 lbs → la regla es mayoreo",         wholesaleByWeight[0]?.id === "rule-wholesale", true)

const wholesaleByCount = selectApplicableRules(rules, { cartTotalQ: 100, totalItems: 5, totalWeightLbs: 2 })
assertBool("5 items → solo mayoreo (1 regla)",          wholesaleByCount.length === 1, true)
assertBool("5 items → la regla es mayoreo",             wholesaleByCount[0]?.id === "rule-wholesale", true)

const standardOnly = selectApplicableRules(rules, { cartTotalQ: 200, totalItems: 1, totalWeightLbs: 2 })
assertBool("1 item + 2 lbs → solo estándar (1 regla)",  standardOnly.length === 1, true)
assertBool("1 item + 2 lbs → la regla es estándar",     standardOnly[0]?.id === "rule-standard", true)

// Mayoreo + subtotal > Q350: debe devolver mayoreo, NO estándar
const mayoreoConSubtotalAlto = selectApplicableRules(rules, { cartTotalQ: 1497, totalItems: 3, totalWeightLbs: 27 })
assertBool("mayoreo con subtotal Q1497 → solo 1 opción", mayoreoConSubtotalAlto.length === 1, true)
assertBool("esa opción es mayoreo, no estándar",          mayoreoConSubtotalAlto[0]?.id === "rule-wholesale", true)

// ─── 6. Escenario completo: 3 lámparas (27 lbs) ──────────────────────────────

console.log("\n=== Escenario completo: 3 lámparas × 9 lb = 27 lbs ===")

const lamparaItems: CartItemWeight[] = [
  { weightRaw: 9, weightUnit: "lb", quantity: 3, variantId: "lampara-solar-400w" },
]
const totalLbs = calcTotalWeightLbs(lamparaItems)
const ctx: ShippingContext = { cartTotalQ: 1497, totalItems: 3, totalWeightLbs: totalLbs }
const [reglaAplicable] = selectApplicableRules(rules, ctx)
const monto = calcShippingAmount(reglaAplicable, ctx)

assert("peso total = 27 lbs",            totalLbs, 27)
assertBool("regla = mayoreo",            reglaAplicable.id === "rule-wholesale", true)
assert("costo = Q25.50 (17 lbs × 1.50)", monto, 25.50)

// ─── Resumen ──────────────────────────────────────────────────────────────────

console.log(`\n${"─".repeat(50)}`)
console.log(`  ${passed} pruebas pasaron   ${failed > 0 ? `${failed} fallaron` : ""}`)
console.log(`${"─".repeat(50)}\n`)

if (failed > 0) process.exit(1)
