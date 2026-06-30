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
}

type EditForm = {
  name: string
  region_code: string
  flat_rate: string
  free_above_amount: string
  priority: string
}

const toQuetzales = (centavos: number | null) => {
  if (centavos === null) return "—"
  return `Q${(centavos / 100).toFixed(2)}`
}

const ShippingRulesPage = () => {
  const [rules, setRules] = useState<ShippingRule[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    region_code: "",
    flat_rate: "",
    free_above_amount: "",
    priority: "0",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: "",
    region_code: "GT",
    flat_rate: "",
    free_above_amount: "",
    priority: "0",
  })

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

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        region_code: form.region_code || undefined,
        priority: parseInt(form.priority) || 0,
      }
      if (form.flat_rate) {
        payload.flat_rate = Math.round(parseFloat(form.flat_rate) * 100)
      }
      if (form.free_above_amount) {
        payload.free_above_amount = Math.round(
          parseFloat(form.free_above_amount) * 100
        )
      }
      const res = await fetch(`${base}/admin/shipping-rules`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Regla de envío creada")
      setShowCreate(false)
      setForm({
        name: "",
        region_code: "GT",
        flat_rate: "",
        free_above_amount: "",
        priority: "0",
      })
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
      flat_rate:
        rule.flat_rate !== null ? (rule.flat_rate / 100).toFixed(2) : "",
      free_above_amount:
        rule.free_above_amount !== null
          ? (rule.free_above_amount / 100).toFixed(2)
          : "",
      priority: String(rule.priority),
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      toast.error("El nombre es requerido")
      return
    }
    setEditSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        region_code: editForm.region_code || null,
        priority: parseInt(editForm.priority) || 0,
        flat_rate: editForm.flat_rate
          ? Math.round(parseFloat(editForm.flat_rate) * 100)
          : null,
        free_above_amount: editForm.free_above_amount
          ? Math.round(parseFloat(editForm.free_above_amount) * 100)
          : null,
      }
      const res = await fetch(`${base}/admin/shipping-rules/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    if (
      !confirm(
        `¿Eliminar la regla "${rule.name}"? Esta acción no se puede deshacer.`
      )
    )
      return
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
          <Heading level="h3" className="mb-4">
            Nueva Regla de Envío
          </Heading>
          <p className="text-ui-fg-subtle txt-small mb-4">
            Los montos se ingresan en Quetzales (Q). Ej: 25.00 = Q25.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-y-1">
              <Label htmlFor="rule-name" size="small">
                Nombre *
              </Label>
              <Input
                id="rule-name"
                size="small"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Ej: Envío gratis sobre Q300"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="rule-region" size="small">
                Código de Región
              </Label>
              <Input
                id="rule-region"
                size="small"
                value={form.region_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, region_code: e.target.value }))
                }
                placeholder="GT"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="rule-priority" size="small">
                Prioridad
              </Label>
              <Input
                id="rule-priority"
                size="small"
                type="number"
                min="0"
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="rule-flat" size="small">
                Tarifa Fija (Q)
              </Label>
              <Input
                id="rule-flat"
                size="small"
                type="number"
                min="0"
                step="0.50"
                value={form.flat_rate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, flat_rate: e.target.value }))
                }
                placeholder="25.00"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="rule-free" size="small">
                Gratis a partir de (Q)
              </Label>
              <Input
                id="rule-free"
                size="small"
                type="number"
                min="0"
                step="1"
                value={form.free_above_amount}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    free_above_amount: e.target.value,
                  }))
                }
                placeholder="300.00"
              />
            </div>
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button
                size="small"
                variant="secondary"
                onClick={() => setShowCreate(false)}
              >
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
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          Cargando reglas de envío...
        </div>
      ) : rules.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay reglas de envío registradas. Crea la primera haciendo clic en
          "+ Nueva Regla".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Región</Table.HeaderCell>
              <Table.HeaderCell>Tarifa Fija</Table.HeaderCell>
              <Table.HeaderCell>Gratis sobre</Table.HeaderCell>
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
                    <Input
                      size="small"
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="Nombre"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      value={editForm.region_code}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          region_code: e.target.value,
                        }))
                      }
                      placeholder="GT"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      type="number"
                      min="0"
                      step="0.50"
                      value={editForm.flat_rate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          flat_rate: e.target.value,
                        }))
                      }
                      placeholder="Q"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      type="number"
                      min="0"
                      value={editForm.free_above_amount}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          free_above_amount: e.target.value,
                        }))
                      }
                      placeholder="Q"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      type="number"
                      min="0"
                      value={editForm.priority}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          priority: e.target.value,
                        }))
                      }
                      placeholder="0"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={rule.is_active ? "green" : "grey"}
                      size="2xsmall"
                    >
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button
                        size="small"
                        isLoading={editSaving}
                        onClick={handleSaveEdit}
                      >
                        Guardar
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ) : (
                <Table.Row key={rule.id}>
                  <Table.Cell className="font-medium">{rule.name}</Table.Cell>
                  <Table.Cell>
                    {rule.region_code ? (
                      <Badge color="purple" size="2xsmall">
                        {rule.region_code}
                      </Badge>
                    ) : (
                      <span className="text-ui-fg-muted">Global</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="font-medium">
                    {toQuetzales(rule.flat_rate)}
                  </Table.Cell>
                  <Table.Cell>
                    {rule.free_above_amount !== null ? (
                      <span className="text-green-600 font-medium">
                        {toQuetzales(rule.free_above_amount)}
                      </span>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-center">
                    {rule.priority}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={rule.is_active ? "green" : "grey"}
                      size="2xsmall"
                    >
                      {rule.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => handleStartEdit(rule)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => handleToggle(rule)}
                      >
                        {rule.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDelete(rule)}
                      >
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
  label: "Reglas de Envío",
  icon: TruckFast,
})

export default ShippingRulesPage
