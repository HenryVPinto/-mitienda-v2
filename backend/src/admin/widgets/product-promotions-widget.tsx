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
  const [loading, setLoading] = useState(true)
  const [linking, setLinking] = useState(false)
  const [selectedRuleId, setSelectedRuleId] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchLinkedRules = async () => {
    try {
      const res = await fetch(
        `${base}/admin/products/${productId}/relations`,
        { credentials: "include" }
      )
      const data = await res.json()
      // For now show count from relations — full list via promotion-rules endpoint
      setLinkedRules([])
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchAllRules = async () => {
    try {
      const res = await fetch(`${base}/admin/promotion-rules?is_active=true`, {
        credentials: "include",
      })
      const data = await res.json()
      setAllRules(data.promotion_rules ?? [])
    } catch {
      // silently ignore
    }
  }

  // Fetch rules linked to this product via the products endpoint of each rule
  const fetchProductRules = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/promotion-rules`, {
        credentials: "include",
      })
      const data = await res.json()
      const all: PromoRule[] = data.promotion_rules ?? []

      // Check which rules have this product linked
      const linked: PromoRule[] = []
      for (const rule of all) {
        const r = await fetch(
          `${base}/admin/promotion-rules/${rule.id}/products`,
          { credentials: "include" }
        )
        const rd = await r.json()
        const products: { id: string }[] = rd.products ?? []
        if (products.some((p) => p.id === productId)) {
          linked.push(rule)
        }
      }
      setLinkedRules(linked)
    } catch {
      // silently ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductRules()
  }, [productId])

  const handleStartLink = async () => {
    await fetchAllRules()
    setSelectedRuleId("")
    setLinking(true)
  }

  const handleLink = async () => {
    if (!selectedRuleId) return
    setSaving(true)
    try {
      const res = await fetch(
        `${base}/admin/promotion-rules/${selectedRuleId}/products`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        }
      )
      if (!res.ok) throw new Error()
      toast.success("Regla vinculada")
      setLinking(false)
      fetchProductRules()
    } catch {
      toast.error("Error al vincular regla")
    } finally {
      setSaving(false)
    }
  }

  const handleUnlink = async (ruleId: string) => {
    try {
      await fetch(
        `${base}/admin/promotion-rules/${ruleId}/products/${productId}`,
        { method: "DELETE", credentials: "include" }
      )
      toast.success("Regla desvinculada")
      fetchProductRules()
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
                  .filter((r) => !linkedRules.some((l) => l.id === r.id))
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
