# Shipping Calculator — Documentación Técnica

## Arquitectura

La lógica de cálculo de envíos vive en un único archivo utilitario. Tanto el storefront como el checkout de Medusa importan desde él. Cualquier cambio en reglas de negocio se hace en un solo lugar.

```
backend/src/modules/shipping-rules/utils/shipping-calculator.ts
                        ↑ fuente única de verdad
                       / \
                      /   \
    store/mt-shipping-options/route.ts     mt-fulfillment/index.ts
    (muestra opciones al cliente)          (cobra al confirmar pedido)
```

---

## Archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| `modules/shipping-rules/utils/shipping-calculator.ts` | Toda la lógica de negocio: peso, selección de regla, cálculo de monto |
| `api/store/mt-shipping-options/route.ts` | HTTP handler: consulta DB, construye contexto, llama al calculator, devuelve JSON |
| `modules/mt-fulfillment/index.ts` | Fulfillment provider de Medusa: recibe la regla ya elegida por el cliente, llama al calculator |
| `modules/shipping-rules/utils/shipping-calculator.test.ts` | 26 pruebas unitarias ejecutables sin framework externo |

---

## Flujo del cálculo

### Storefront (`GET /store/mt-shipping-options?cart_id=...`)

```
1. Consultar items del carrito (price, quantity, weight, weight_unit)
2. calcTotalWeightLbs(items)          → totalWeightLbs en libras
3. Construir ShippingContext          → { cartTotalQ, totalItems, totalWeightLbs }
4. Consultar reglas activas de la DB  → ordenadas por priority DESC
5. selectApplicableRules(rules, ctx)  → exclusividad: mayoreo O estándar
6. calcShippingAmount(rule, ctx)       → monto en quetzales
7. Retornar { shipping_options: [...] }
```

### Checkout (`calculatePrice` en Medusa)

```
1. Obtener cartTotalQ de context.items
2. Buscar regla por ruleId (la que el cliente seleccionó)
   └─ Fallback: regla más prioritaria por monto del carrito
3. Consultar product.metadata.weight_unit por producto
4. calcTotalWeightLbs(items)          → totalWeightLbs
5. calcShippingAmount(rule, ctx)       → monto en quetzales
6. Retornar { calculated_amount }
```

---

## Lógica de prioridad de reglas

Las reglas se consultan ordenadas por `priority DESC`. La selección es **exclusiva**:

```
┌─ ¿Existe alguna regla de mayoreo que aplique al carrito?
│
├─ SÍ → Usar solo esa regla. Ignorar todas las demás.
│        (el cliente no puede elegir envío gratis aunque supere Q350)
│
└─ NO → Evaluar todas las reglas estándar aplicables.
         (se muestra envío gratis si corresponde, o tarifa fija)
```

Una regla de mayoreo aplica si:
- El peso total del carrito supera `weight_threshold_lbs`, **O**
- La cantidad de artículos es mayor o igual a `min_item_quantity`

---

## Lógica de libras adicionales

```
si totalWeightLbs > weight_threshold_lbs:
    extraLbs    = totalWeightLbs - weight_threshold_lbs
    costo_extra = Math.round(extraLbs × rate_per_lb × 100) / 100
    total       = flat_rate + costo_extra

si totalWeightLbs ≤ weight_threshold_lbs (pero aplica por cantidad):
    total = flat_rate   ← NUNCA gratis en mayoreo
```

Ejemplo con Regla 2 (`threshold=10 lbs`, `rate=Q1.50/lb`, `flat_rate=Q0`):

| Peso total | Extra lbs | Costo |
|---|---|---|
| 8 lbs  | — | Q0.00 (bajo umbral) |
| 10 lbs | 0 | Q0.00 (exacto en umbral) |
| 11 lbs | 1 | Q1.50 |
| 12.5 lbs | 2.5 | Q3.75 |
| 20 lbs | 10 | Q15.00 |
| 27 lbs | 17 | Q25.50 |

---

## Conversión de unidades de peso

El calculador lee `product.metadata.weight_unit` para saber en qué unidad está guardado el peso de cada producto:

| Unidad | Factor de conversión a lbs |
|---|---|
| `lb` / `lbs` | × 1 |
| `g` (gramos) | × 0.002205 (÷ 453.592) |
| `kg` | × 2.20462 |
| `oz` | × 0.0625 |

Si `weight_unit` no está configurado, se asume gramos (`g`).

**Importante:** Si un producto tiene `weight = 0` o `null`, el sistema registra un `console.warn` con el `variant_id` para facilitar el diagnóstico.

---

## Cómo agregar una nueva regla de envío

### Opción A — Nueva regla con los campos existentes

Si la nueva regla puede expresarse con los campos actuales (`flat_rate`, `free_above_amount`, `weight_threshold_lbs`, etc.), solo crea una nueva entrada en el admin y el sistema la evaluará automáticamente.

### Opción B — Nuevo tipo de regla (express, pickup, zona, etc.)

1. **Agregar campos al modelo** si son necesarios (migración de DB):

```typescript
// models/shipping-rule.ts
is_express: model.boolean().default(false),
express_surcharge: model.number().nullable(),
```

2. **Implementar un nuevo evaluador** en `shipping-calculator.ts`:

```typescript
const expressEvaluator: RuleEvaluator = {
  type: "express",

  handles(rule) {
    return rule.metadata?.is_express === true
  },

  applies(_rule, _context) {
    return true // siempre disponible cuando el producto lo requiere
  },

  calculate(rule, _context) {
    const flatRateQ = (rule.flat_rate ?? 0) / 100
    const surcharge = (rule.metadata?.express_surcharge as number) ?? 50
    return {
      amountQ: flatRateQ + surcharge,
      partial: { ruleType: "express", additionalCostQ: surcharge },
    }
  },
}
```

3. **Registrar el evaluador** al iniciar el servidor (antes del primer request):

```typescript
// medusa-config.ts o en un plugin de inicialización
import { registerEvaluator } from "./modules/shipping-rules/utils/shipping-calculator"
registerEvaluator(expressEvaluator)
```

Los evaluadores registrados con `registerEvaluator` tienen prioridad sobre los built-in (mayoreo y estándar).

---

## Logs de depuración

Activar con la variable de entorno:

```bash
SHIPPING_CALCULATOR_DEBUG=true
```

Cuando está activo, cada cálculo registra:

```json
{
  "subtotalQ": 1497,
  "totalItems": 3,
  "totalWeightLbs": 27.0,
  "ruleId": "mtshr_...",
  "ruleName": "Mayoreo",
  "ruleType": "wholesale",
  "triggeredBy": "weight",
  "thresholdLbs": 10,
  "extraLbs": 17.0,
  "flatRateQ": 0,
  "freeThresholdQ": null,
  "additionalCostQ": 25.5,
  "totalAmountQ": 25.5
}
```

En producción esta variable debe estar **desactivada** (o ausente). Solo activar temporalmente para diagnóstico.

---

## Ejecutar las pruebas

```bash
cd backend
node --require ts-node/register src/modules/shipping-rules/utils/shipping-calculator.test.ts
```

Las pruebas no requieren base de datos ni servidor. Son funciones puras.

Resultado esperado: **26 pruebas pasando**.
