/**
 * Pruebas para la lógica de cálculo de envío por peso (mayoreo).
 * Ejecutar con: npx ts-node src/modules/mt-fulfillment/weight-calculation.test.ts
 */

const TO_LBS: Record<string, number> = {
  lb: 1, lbs: 1, g: 1 / 453.592, kg: 2.20462, oz: 0.0625,
}

function calcWeightShipping(
  totalWeightLbs: number,
  thresholdLbs: number,
  ratePerLb: number,
  flatRateQ: number
): number {
  if (totalWeightLbs > thresholdLbs) {
    const extraLbs = totalWeightLbs - thresholdLbs
    const weightCost = Math.round(extraLbs * ratePerLb * 100) / 100
    return flatRateQ + weightCost
  }
  return flatRateQ
}

function calcTotalWeightLbs(
  items: Array<{ weight: number; quantity: number; weightUnit?: string }>
): number {
  return items.reduce((sum, item) => {
    const unit = item.weightUnit ?? "g"
    const factor = TO_LBS[unit] ?? TO_LBS["g"]
    return sum + item.weight * factor * item.quantity
  }, 0)
}

// Configuración de Regla 2 (mayoreo)
const THRESHOLD_LBS = 10
const RATE_PER_LB = 1.50
const FLAT_RATE_Q = 0   // tarifa base (ajustar si la regla tiene flat_rate distinto de 0)

const cases: Array<{ label: string; totalLbs: number; expectedExtra: number }> = [
  { label: "8 lbs  → tarifa base",          totalLbs: 8,    expectedExtra: 0 },
  { label: "10 lbs → tarifa base",          totalLbs: 10,   expectedExtra: 0 },
  { label: "11 lbs → tarifa base + Q1.50",  totalLbs: 11,   expectedExtra: 1.50 },
  { label: "12.5 lbs → tarifa base + Q3.75",totalLbs: 12.5, expectedExtra: 3.75 },
  { label: "20 lbs → tarifa base + Q15.00", totalLbs: 20,   expectedExtra: 15.00 },
]

console.log("=== Pruebas de cálculo de envío por peso ===\n")

let passed = 0
let failed = 0

for (const { label, totalLbs, expectedExtra } of cases) {
  const expected = FLAT_RATE_Q + expectedExtra
  const result   = calcWeightShipping(totalLbs, THRESHOLD_LBS, RATE_PER_LB, FLAT_RATE_Q)
  const ok       = Math.abs(result - expected) < 0.001

  const extra = totalLbs > THRESHOLD_LBS
    ? `extraLbs=${(totalLbs - THRESHOLD_LBS).toFixed(2)}`
    : "bajo umbral"

  console.log(`${ok ? "✓" : "✗"} ${label}`)
  if (!ok) {
    console.log(`    → resultado: Q${result.toFixed(2)}, esperado: Q${expected.toFixed(2)}`)
  } else {
    console.log(`    → Q${result.toFixed(2)} (${extra})`)
  }
  ok ? passed++ : failed++
}

console.log(`\n--- ${passed} pasaron, ${failed} fallaron ---\n`)

// Prueba de conversión de unidades
console.log("=== Prueba de suma de pesos (item.weight × item.quantity) ===\n")

const lampItems = [
  { weight: 4082, quantity: 3, weightUnit: "g" },  // 9 lb cada una en gramos
]
const lampWeight = calcTotalWeightLbs(lampItems)
console.log(`3 lámparas × 4082g = ${lampWeight.toFixed(2)} lbs (esperado ~27.00)`)
console.log(Math.abs(lampWeight - 27) < 0.1 ? "✓ correcto" : "✗ incorrecto")

const lampItemsInLbs = [
  { weight: 9, quantity: 3, weightUnit: "lb" },  // 9 lb cada una
]
const lampWeightLbs = calcTotalWeightLbs(lampItemsInLbs)
console.log(`\n3 lámparas × 9lb = ${lampWeightLbs.toFixed(2)} lbs (esperado 27.00)`)
console.log(Math.abs(lampWeightLbs - 27) < 0.001 ? "✓ correcto" : "✗ incorrecto")
