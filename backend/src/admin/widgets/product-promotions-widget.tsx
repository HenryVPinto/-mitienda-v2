import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Badge, Button, Container, Heading, Select, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type PromoRule = {
  id: string
  name: string
  type: "COMBO" | "GIFT" | "QUANTITY_DISCOUNT" | "WHOLESALE"
  is_active: boolean
  min_quantity: number | null
  discount_percentage: number | null
}

type Props = {
  data: { id: string }
}

const TYPE_LABELS: Record<PromoRule["type"], string> = {
  QUANTITY_DISCOUNT: "Desc. Cantidad",
  WHOLESALE: "Mayorista",
  COMBO: "Combo",
  GIFT: "Regalo",
}

const TYPE_COLORS: Record<PromoRule["type"], "blue" | "purple" | "orange" | "green"> = {
  QUANTITY_DISCOUNT: "blue",
  WHOLESALE: "purple",
  COMBO: "orange",
  GIFT: "green",
}

const ProductPromotionsWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [linkedRules, setLinkedRules] = useState<PromoRule[]>([])
  const [allRules, setAllRules] = useState<PromoRule[]>([])
  const [productMeta, setProductMeta] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [productRes, rulesRes] = await Promise.all([
        fetch(`${base}/admin/products/${productId}?fields=id,metadata`, { credentials: "include" }),
        fetch(`${base}/admin/promotion-rules`, { credentials: "include" }),
      ])

      const productData = await productRes.json()
      const rulesData = await rulesRes.json()

      const meta: Record<string, unknown> = productData.product?.metadata ?? {}
      const ruleIds: string[] = Array.isArray(meta.promo_rule_ids)
        ? (meta.promo_rule_ids as string[])
        : []

      const all: PromoRule[] = rulesData.promotion_rules ?? []
      const linked = all.filter((r) => ruleIds.includes(r.id))

      setProductMeta(meta)
      setAllRules(all)
      setLinkedRules(linked)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [productId])

  const handleStartLink = () => {
    setSelectedRuleId("")
    setLinking(true)
  }

  const handleLink = async () => {
    if (!selectedRuleId) return
    setSaving(true)
    try {
      const currentIds: string[] = Array.isArray(productMeta.promo_rule_ids)
        ? (productMeta.promo_rule_ids as string[])
        : []

      const newIds = [...currentIds, selectedRuleId]

      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...productMeta, promo_rule_ids: newIds } }),
      })

      if (!res.ok) throw new Error()
      toast.success("Regla vinculada")
      setLinking(false)
      fetchData()
    } catch {
      toast.error("Error al vincular regla")
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async (ruleId: string) => {
    try {
      const currentIds: string[] = Array.isArray(productMeta.promo_rule_ids)
        ? (productMeta.promo_rule_ids as string[])
        : []

      const newIds = currentIds.filter((id) => id !== ruleId)

      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: { ...productMeta, promo_rule_ids: newIds } }),
      })

      if (!res.ok) throw new Error()
      toast.success("Regla desvinculada")
      fetchData()
    } catch {
      toast.error("Error al desvincular")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Reglas de Precio
        </Heading>
        {!linking && !loading && (
          <Button size="small" variant="transparent" onClick={handleStartLink}>
            Vincular
          </Button>
        )}
      </div>

      <div className="px-4 py-3">
        {loading ? (
          <p className="text-ui-fg-subtle text-sm">Cargando...</p>
        ) : linking ? (
          <div className="flex flex-col gap-y-2">
            <Select value={selectedRuleId} onValueChange={setSelectedRuleId}>
              <Select.Trigger>
                <Select.Value placeholder="Seleccionar regla..." />
              </Select.Trigger>
              <Select.Content>
                {allRules
                  .filter((r) => r.is_active && !linkedRules.some((l) => l.id === r.id))
                  .map((r) => (
                    <Select.Item key={r.id} value={r.id}>
                      {r.name}
                    </Select.Item>
                  ))}
              </Select.Content>
            </Select>
            <div className="flex gap-x-2">
              <Button
                size="small"
                isLoading={saving}
                onClick={handleLink}
                disabled={!selectedRuleId}
              >
                Vincular
              </Button>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setLinking(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : linkedRules.length === 0 ? (
          <p className="text-ui-fg-subtle text-sm">Sin reglas vinculadas</p>
        ) : (
          <div className="flex flex-col gap-y-2">
            {linkedRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between">
                <div className="flex items-center gap-x-2">
                  <Badge color={TYPE_COLORS[rule.type]} size="2xsmall">
                    {TYPE_LABELS[rule.type]}
                  </Badge>
                  <span className="text-sm">{rule.name}</span>
                </div>
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => handleUnlink(rule.id)}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductPromotionsWidget
