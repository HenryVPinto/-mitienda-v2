import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ReceiptPercent } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Table,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type PromoRule = {
  id: string
  name: string
  type: "COMBO" | "GIFT" | "QUANTITY_DISCOUNT" | "WHOLESALE"
  description: string | null
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  min_quantity: number | null
  discount_percentage: number | null
  discount_amount: number | null
  gift_product_id: string | null
  gift_quantity: number | null
  created_at: string
}

type CreateForm = {
  name: string
  type: PromoRule["type"]
  description: string
  min_quantity: string
  discount_percentage: string
  discount_amount: string
  gift_product_id: string
  gift_quantity: string
  starts_at: string
  ends_at: string
}

type EditForm = CreateForm

const TYPE_LABELS: Record<PromoRule["type"], string> = {
  QUANTITY_DISCOUNT: "Descuento por Cantidad",
  WHOLESALE: "Precio Mayorista",
  COMBO: "Combo",
  GIFT: "Regalo",
}

const TYPE_COLORS: Record<PromoRule["type"], "blue" | "purple" | "orange" | "green"> = {
  QUANTITY_DISCOUNT: "blue",
  WHOLESALE: "purple",
  COMBO: "orange",
  GIFT: "green",
}

const emptyForm = (): CreateForm => ({
  name: "",
  type: "QUANTITY_DISCOUNT",
  description: "",
  min_quantity: "",
  discount_percentage: "",
  discount_amount: "",
  gift_product_id: "",
  gift_quantity: "1",
  starts_at: "",
  ends_at: "",
})

const RuleFields = ({
  f,
  set,
}: {
  f: CreateForm
  set: (fn: (prev: CreateForm) => CreateForm) => void
}) => (
  <>
    {(f.type === "QUANTITY_DISCOUNT" || f.type === "WHOLESALE") && (
      <div className="flex flex-col gap-y-1">
        <Label size="small">Cantidad mínima</Label>
        <Input
          size="small"
          type="number"
          min="1"
          value={f.min_quantity}
          onChange={(e) => set((p) => ({ ...p, min_quantity: e.target.value }))}
          placeholder="3"
        />
      </div>
    )}
    {f.type === "QUANTITY_DISCOUNT" && (
      <div className="flex flex-col gap-y-1">
        <Label size="small">Descuento (%)</Label>
        <Input
          size="small"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={f.discount_percentage}
          onChange={(e) => set((p) => ({ ...p, discount_percentage: e.target.value }))}
          placeholder="10"
        />
      </div>
    )}
    {f.type === "COMBO" && (
      <div className="flex flex-col gap-y-1">
        <Label size="small">Descuento combo (%)</Label>
        <Input
          size="small"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={f.discount_percentage}
          onChange={(e) => set((p) => ({ ...p, discount_percentage: e.target.value }))}
          placeholder="15"
        />
      </div>
    )}
    {f.type === "GIFT" && (
      <>
        <div className="flex flex-col gap-y-1">
          <Label size="small">ID producto regalo</Label>
          <Input
            size="small"
            value={f.gift_product_id}
            onChange={(e) => set((p) => ({ ...p, gift_product_id: e.target.value }))}
            placeholder="prod_01..."
          />
        </div>
        <div className="flex flex-col gap-y-1">
          <Label size="small">Cantidad regalo</Label>
          <Input
            size="small"
            type="number"
            min="1"
            value={f.gift_quantity}
            onChange={(e) => set((p) => ({ ...p, gift_quantity: e.target.value }))}
            placeholder="1"
          />
        </div>
      </>
    )}
    <div className="flex flex-col gap-y-1">
      <Label size="small">Vigencia desde</Label>
      <Input
        size="small"
        type="date"
        value={f.starts_at}
        onChange={(e) => set((p) => ({ ...p, starts_at: e.target.value }))}
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Vigencia hasta</Label>
      <Input
        size="small"
        type="date"
        value={f.ends_at}
        onChange={(e) => set((p) => ({ ...p, ends_at: e.target.value }))}
      />
    </div>
  </>
)

const PromotionsPage = () => {
  const [rules, setRules] = useState<PromoRule[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<CreateForm>(emptyForm())

  const base = window.location.origin

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/promotion-rules`, {
        credentials: "include",
      })
      const data = await res.json()
      setRules(data.promotion_rules ?? [])
      setCount(data.count ?? 0)
    } catch {
      toast.error("Error al cargar reglas")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const buildPayload = (f: CreateForm) => {
    const payload: Record<string, unknown> = {
      name: f.name,
      type: f.type,
      description: f.description || null,
      starts_at: f.starts_at || null,
      ends_at: f.ends_at || null,
    }
    if (f.min_quantity) payload.min_quantity = parseInt(f.min_quantity)
    if (f.discount_percentage) payload.discount_percentage = parseFloat(f.discount_percentage)
    if (f.discount_amount) payload.discount_amount = Math.round(parseFloat(f.discount_amount) * 100)
    if (f.gift_product_id) payload.gift_product_id = f.gift_product_id
    if (f.gift_quantity) payload.gift_quantity = parseInt(f.gift_quantity)
    return payload
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/promotion-rules`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Regla creada")
      setShowCreate(false)
      setForm(emptyForm())
      fetchRules()
    } catch (e: any) {
      toast.error(e.message || "Error al crear regla")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (rule: PromoRule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      type: rule.type,
      description: rule.description ?? "",
      min_quantity: rule.min_quantity !== null ? String(rule.min_quantity) : "",
      discount_percentage: rule.discount_percentage !== null ? String(rule.discount_percentage) : "",
      discount_amount: rule.discount_amount !== null ? String(rule.discount_amount / 100) : "",
      gift_product_id: rule.gift_product_id ?? "",
      gift_quantity: rule.gift_quantity !== null ? String(rule.gift_quantity) : "1",
      starts_at: rule.starts_at ? rule.starts_at.slice(0, 10) : "",
      ends_at: rule.ends_at ? rule.ends_at.slice(0, 10) : "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/promotion-rules/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al guardar")
      }
      toast.success("Regla actualizada")
      setEditingId(null)
      fetchRules()
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (rule: PromoRule) => {
    try {
      await fetch(`${base}/admin/promotion-rules/${rule.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      toast.success(rule.is_active ? "Regla desactivada" : "Regla activada")
      fetchRules()
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleDelete = async (rule: PromoRule) => {
    if (!confirm(`¿Eliminar la regla "${rule.name}"?`)) return
    try {
      await fetch(`${base}/admin/promotion-rules/${rule.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Regla eliminada")
      fetchRules()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Reglas de Precio</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {count} {count === 1 ? "regla registrada" : "reglas registradas"}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nueva Regla"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nueva Regla de Precio</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="rule-name" size="small">Nombre *</Label>
              <Input
                id="rule-name"
                size="small"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej: Mayoreo 3 unidades"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small">Tipo *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v as PromoRule["type"] }))}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="QUANTITY_DISCOUNT">Descuento por Cantidad</Select.Item>
                  <Select.Item value="WHOLESALE">Precio Mayorista</Select.Item>
                  <Select.Item value="COMBO">Combo</Select.Item>
                  <Select.Item value="GIFT">Regalo</Select.Item>
                </Select.Content>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-y-1">
              <Label size="small">Descripción</Label>
              <Input
                size="small"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descripción visible al cliente"
              />
            </div>
            <RuleFields f={form} set={setForm} />
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>
                Crear Regla
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando reglas...</div>
      ) : rules.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay reglas de precio. Crea la primera haciendo clic en "+ Nueva Regla".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Condición</Table.HeaderCell>
              <Table.HeaderCell>Vigencia</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.map((rule) =>
              editingId === rule.id ? (
                <Table.Row key={rule.id} className="bg-ui-bg-subtle">
                  <Table.Cell>
                    <Input
                      size="small"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Select
                      value={editForm.type}
                      onValueChange={(v) =>
                        setEditForm((f) => ({ ...f, type: v as PromoRule["type"] }))
                      }
                    >
                      <Select.Trigger>
                        <Select.Value />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="QUANTITY_DISCOUNT">Desc. Cantidad</Select.Item>
                        <Select.Item value="WHOLESALE">Mayorista</Select.Item>
                        <Select.Item value="COMBO">Combo</Select.Item>
                        <Select.Item value="GIFT">Regalo</Select.Item>
                      </Select.Content>
                    </Select>
                  </Table.Cell>
                  <Table.Cell colSpan={2}>
                    <div className="grid grid-cols-2 gap-2">
                      <RuleFields f={editForm} set={setEditForm} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={rule.is_active ? "green" : "grey"} size="2xsmall">
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end">
                      <Button size="small" isLoading={editSaving} onClick={handleSaveEdit}>
                        Guardar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => setEditingId(null)}>
                        Cancelar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                <Table.Row key={rule.id}>
                  <Table.Cell>
                    <p className="font-medium">{rule.name}</p>
                    {rule.description && (
                      <p className="text-ui-fg-subtle text-xs">{rule.description}</p>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={TYPE_COLORS[rule.type]} size="2xsmall">
                      {TYPE_LABELS[rule.type]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-sm text-ui-fg-subtle">
                    {rule.type === "QUANTITY_DISCOUNT" &&
                      `${rule.min_quantity}+ uds → ${rule.discount_percentage}% off`}
                    {rule.type === "WHOLESALE" && `${rule.min_quantity}+ uds → precio mayorista`}
                    {rule.type === "COMBO" && `Combo → ${rule.discount_percentage}% off`}
                    {rule.type === "GIFT" && `Regalo: ${rule.gift_quantity}x prod`}
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {rule.starts_at || rule.ends_at
                      ? `${rule.starts_at ? new Date(rule.starts_at).toLocaleDateString("es-GT") : "∞"} → ${rule.ends_at ? new Date(rule.ends_at).toLocaleDateString("es-GT") : "∞"}`
                      : "Sin límite"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={rule.is_active ? "green" : "grey"} size="2xsmall">
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(rule)}>
                        Editar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => handleToggle(rule)}>
                        {rule.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(rule)}>
                        Eliminar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              )
            )}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reglas de Precio",
  icon: ReceiptPercent,
})

export default PromotionsPage
