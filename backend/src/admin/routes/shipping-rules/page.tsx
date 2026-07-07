import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TruckFast } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type ShippingRule = {
  id: string
  name: string
  description: string | null
  region_code: string | null
  min_order_amount: number | null
  max_order_amount: number | null
  flat_rate: number | null
  free_above_amount: number | null
  weight_threshold_lbs: number | null
  rate_per_lb: number | null
  min_item_quantity: number | null
  is_active: boolean
  priority: number
  created_at: string
}

type CreateForm = {
  name: string
  region_code: string
  flat_rate: string
  free_above_amount: string
  priority: string
  weight_threshold_lbs: string
  rate_per_lb: string
  min_item_quantity: string
}

type EditForm = {
  name: string
  region_code: string
  flat_rate: string
  free_above_amount: string
  priority: string
  weight_threshold_lbs: string
  rate_per_lb: string
  min_item_quantity: string
}

const toQuetzales = (centavos: number | null) => {
  if (centavos === null) return "—"
  return `Q${(centavos / 100).toFixed(2)}`
}

const emptyCreate: CreateForm = {
  name: "",
  region_code: "GT",
  flat_rate: "",
  free_above_amount: "",
  priority: "0",
  weight_threshold_lbs: "",
  rate_per_lb: "",
  min_item_quantity: "",
}

const ShippingRulesPage = () => {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ ...emptyCreate })
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<CreateForm>({ ...emptyCreate })

  const base = window.location.origin

  const fetchRules = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/shipping-rules`, {
        credentials: "include",
      })
      const data = await res.json()
      setRules(data.shipping_rules ?? [])
      setCount(data.count ?? 0)
    } catch {
      toast.error("Error al cargar reglas de envío")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const buildPayload = (f: CreateForm | EditForm) => {
    const payload: Record<string, unknown> = {
      name: f.name,
      region_code: f.region_code || null,
      priority: parseInt(f.priority) || 0,
      flat_rate: f.flat_rate ? Math.round(parseFloat(f.flat_rate) * 100) : null,
      free_above_amount: f.free_above_amount ? Math.round(parseFloat(f.free_above_amount) * 100) : null,
      weight_threshold_lbs: f.weight_threshold_lbs ? parseFloat(f.weight_threshold_lbs) : null,
      rate_per_lb: f.rate_per_lb ? parseFloat(f.rate_per_lb) : null,
      min_item_quantity: f.min_item_quantity ? parseInt(f.min_item_quantity) : null,
    }
    return payload
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/shipping-rules`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Regla de envío creada")
      setShowCreate(false)
      setForm({ ...emptyCreate })
      fetchRules()
    } catch (e: any) {
      toast.error(e.message || "Error al crear regla")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (rule: ShippingRule) => {
    setEditingId(rule.id)
    setEditForm({
      name: rule.name,
      region_code: rule.region_code ?? "",
      flat_rate: rule.flat_rate !== null ? (rule.flat_rate / 100).toFixed(2) : "",
      free_above_amount: rule.free_above_amount !== null ? (rule.free_above_amount / 100).toFixed(2) : "",
      priority: String(rule.priority),
      weight_threshold_lbs: rule.weight_threshold_lbs !== null ? String(rule.weight_threshold_lbs) : "",
      rate_per_lb: rule.rate_per_lb !== null ? String(rule.rate_per_lb) : "",
      min_item_quantity: rule.min_item_quantity !== null ? String(rule.min_item_quantity) : "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/shipping-rules/${editingId}`, {
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
      toast.error(e.message || "Error al actualizar regla")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (rule: ShippingRule) => {
    try {
      const res = await fetch(`${base}/admin/shipping-rules/${rule.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(rule.is_active ? "Regla desactivada" : "Regla activada")
      fetchRules()
    } catch {
      toast.error("Error al actualizar regla")
    }
  }

  const handleDelete = async (rule: ShippingRule) => {
    if (!confirm(`¿Eliminar la regla "${rule.name}"? Esta acción no se puede deshacer.`)) return
    try {
      await fetch(`${base}/admin/shipping-rules/${rule.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Regla eliminada")
      fetchRules()
    } catch {
      toast.error("Error al eliminar regla")
    }
  }

  const field = (
    label: string,
    id: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { placeholder?: string; type?: string; step?: string; hint?: string }
  ) => (
    <div className="flex flex-col gap-y-1">
      <Label htmlFor={id} size="small">{label}</Label>
      {opts?.hint && <p className="text-ui-fg-subtle txt-xsmall">{opts.hint}</p>}
      <Input
        id={id}
        size="small"
        type={opts?.type ?? "text"}
        step={opts?.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder ?? ""}
      />
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Reglas de Envío</Heading>
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
          <Heading level="h3" className="mb-4">Nueva Regla de Envío</Heading>
          <p className="text-ui-fg-subtle txt-small mb-4">
            Montos en Quetzales (Q). Los campos de peso son opcionales — solo se usan para tarifa por peso en mayoreo.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              {field("Nombre *", "c-name", form.name, (v) => setForm(f => ({ ...f, name: v })), { placeholder: "Ej: Envío estándar Guatemala" })}
            </div>
            {field("Código de Región", "c-region", form.region_code, (v) => setForm(f => ({ ...f, region_code: v })), { placeholder: "GT" })}
            {field("Prioridad", "c-priority", form.priority, (v) => setForm(f => ({ ...f, priority: v })), { type: "number", placeholder: "0" })}
            {field("Tarifa Fija (Q)", "c-flat", form.flat_rate, (v) => setForm(f => ({ ...f, flat_rate: v })), { type: "number", step: "0.50", placeholder: "25.00" })}
            {field("Gratis a partir de (Q)", "c-free", form.free_above_amount, (v) => setForm(f => ({ ...f, free_above_amount: v })), { type: "number", step: "1", placeholder: "350.00" })}

            <div className="col-span-2 border-t border-ui-border-base pt-3 mt-1">
              <p className="text-ui-fg-subtle txt-small font-medium mb-3">Tarifa por peso (mayoreo)</p>
              <div className="grid grid-cols-3 gap-4">
                {field("Umbral de peso (lbs)", "c-threshold", form.weight_threshold_lbs, (v) => setForm(f => ({ ...f, weight_threshold_lbs: v })), { type: "number", step: "0.5", placeholder: "10", hint: "A partir de cuántas lbs aplica la tarifa extra" })}
                {field("Q por lb adicional", "c-rate", form.rate_per_lb, (v) => setForm(f => ({ ...f, rate_per_lb: v })), { type: "number", step: "0.01", placeholder: "1.50", hint: "Precio por cada libra sobre el umbral" })}
                {field("Mín. items para mayoreo", "c-minqty", form.min_item_quantity, (v) => setForm(f => ({ ...f, min_item_quantity: v })), { type: "number", step: "1", placeholder: "20", hint: "Cant. mínima de items que define mayoreo" })}
              </div>
            </div>

            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>Crear Regla</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando reglas de envío...</div>
      ) : rules.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay reglas de envío. Crea la primera haciendo clic en "+ Nueva Regla".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Región</Table.HeaderCell>
              <Table.HeaderCell>Tarifa Fija</Table.HeaderCell>
              <Table.HeaderCell>Gratis sobre</Table.HeaderCell>
              <Table.HeaderCell>Peso (lbs)</Table.HeaderCell>
              <Table.HeaderCell>Q/lb extra</Table.HeaderCell>
              <Table.HeaderCell>Mín. items</Table.HeaderCell>
              <Table.HeaderCell>Prioridad</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rules.map((rule) =>
              editingId === rule.id ? (
                <Table.Row key={rule.id} className="bg-ui-bg-subtle">
                  <Table.Cell>
                    <Input size="small" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Nombre" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" value={editForm.region_code} onChange={(e) => setEditForm(f => ({ ...f, region_code: e.target.value }))} placeholder="GT" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" step="0.50" value={editForm.flat_rate} onChange={(e) => setEditForm(f => ({ ...f, flat_rate: e.target.value }))} placeholder="Q" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" value={editForm.free_above_amount} onChange={(e) => setEditForm(f => ({ ...f, free_above_amount: e.target.value }))} placeholder="Q" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" step="0.5" value={editForm.weight_threshold_lbs} onChange={(e) => setEditForm(f => ({ ...f, weight_threshold_lbs: e.target.value }))} placeholder="lbs" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" step="0.01" value={editForm.rate_per_lb} onChange={(e) => setEditForm(f => ({ ...f, rate_per_lb: e.target.value }))} placeholder="Q" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" value={editForm.min_item_quantity} onChange={(e) => setEditForm(f => ({ ...f, min_item_quantity: e.target.value }))} placeholder="items" />
                  </Table.Cell>
                  <Table.Cell>
                    <Input size="small" type="number" value={editForm.priority} onChange={(e) => setEditForm(f => ({ ...f, priority: e.target.value }))} placeholder="0" />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={rule.is_active ? "green" : "grey"} size="2xsmall">
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button size="small" isLoading={editSaving} onClick={handleSaveEdit}>Guardar</Button>
                      <Button size="small" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                <Table.Row key={rule.id}>
                  <Table.Cell className="font-medium">{rule.name}</Table.Cell>
                  <Table.Cell>
                    {rule.region_code
                      ? <Badge color="purple" size="2xsmall">{rule.region_code}</Badge>
                      : <span className="text-ui-fg-muted">Global</span>}
                  </Table.Cell>
                  <Table.Cell className="font-medium">{toQuetzales(rule.flat_rate)}</Table.Cell>
                  <Table.Cell>
                    {rule.free_above_amount !== null
                      ? <span className="text-green-600 font-medium">{toQuetzales(rule.free_above_amount)}</span>
                      : <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell>
                    {rule.weight_threshold_lbs !== null
                      ? <span className="text-ui-fg-base">{rule.weight_threshold_lbs} lbs</span>
                      : <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell>
                    {rule.rate_per_lb !== null
                      ? <span className="text-ui-fg-base">Q{rule.rate_per_lb}/lb</span>
                      : <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell>
                    {rule.min_item_quantity !== null
                      ? <span className="text-ui-fg-base">{rule.min_item_quantity}</span>
                      : <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell className="text-center">{rule.priority}</Table.Cell>
                  <Table.Cell>
                    <Badge color={rule.is_active ? "green" : "grey"} size="2xsmall">
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(rule)}>Editar</Button>
                      <Button size="small" variant="secondary" onClick={() => handleToggle(rule)}>
                        {rule.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(rule)}>Eliminar</Button>
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
  label: "Reglas de Envío",
  icon: TruckFast,
})

export default ShippingRulesPage
