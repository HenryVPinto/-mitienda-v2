import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CreditCard } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Table,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type BankAccount = {
  id: string
  bank_name: string
  account_number: string
  account_type: string
  account_holder: string
  logo_url: string | null
  instructions: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

type BankForm = {
  bank_name: string
  account_number: string
  account_type: string
  account_holder: string
  logo_url: string
  instructions: string
  sort_order: string
}

const emptyForm: BankForm = {
  bank_name: "",
  account_number: "",
  account_type: "Monetaria",
  account_holder: "",
  logo_url: "",
  instructions: "",
  sort_order: "0",
}

const BanksPage = () => {
  const [banks, setBanks] = useState<BankAccount[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BankForm>({ ...emptyForm })
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<BankForm>({ ...emptyForm })

  const base = window.location.origin

  const fetchBanks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/cms/banks`, { credentials: "include" })
      const data = await res.json()
      setBanks(data.banks ?? [])
      setCount(data.count ?? 0)
    } catch {
      toast.error("Error al cargar cuentas bancarias")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => { fetchBanks() }, [fetchBanks])

  const buildPayload = (f: BankForm) => ({
    bank_name: f.bank_name,
    account_number: f.account_number,
    account_type: f.account_type,
    account_holder: f.account_holder,
    logo_url: f.logo_url || null,
    instructions: f.instructions || null,
    sort_order: parseInt(f.sort_order) || 0,
  })

  const handleCreate = async () => {
    if (!form.bank_name.trim() || !form.account_number.trim() || !form.account_holder.trim()) {
      toast.error("Banco, número de cuenta y titular son requeridos")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/cms/banks`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) throw new Error((await res.json()).message || "Error al crear")
      toast.success("Cuenta bancaria creada")
      setShowCreate(false)
      setForm({ ...emptyForm })
      fetchBanks()
    } catch (e: any) {
      toast.error(e.message || "Error al crear")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (b: BankAccount) => {
    setEditingId(b.id)
    setEditForm({
      bank_name: b.bank_name,
      account_number: b.account_number,
      account_type: b.account_type,
      account_holder: b.account_holder,
      logo_url: b.logo_url ?? "",
      instructions: b.instructions ?? "",
      sort_order: String(b.sort_order),
    })
  }

  const handleSaveEdit = async () => {
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/cms/banks/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      })
      if (!res.ok) throw new Error((await res.json()).message || "Error al guardar")
      toast.success("Cuenta actualizada")
      setEditingId(null)
      fetchBanks()
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (b: BankAccount) => {
    try {
      await fetch(`${base}/admin/cms/banks/${b.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !b.is_active }),
      })
      toast.success(b.is_active ? "Desactivada" : "Activada")
      fetchBanks()
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleDelete = async (b: BankAccount) => {
    if (!confirm(`¿Eliminar la cuenta de ${b.bank_name}?`)) return
    try {
      await fetch(`${base}/admin/cms/banks/${b.id}`, { method: "DELETE", credentials: "include" })
      toast.success("Cuenta eliminada")
      fetchBanks()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  const FormFields = ({ f, set }: { f: BankForm; set: (f: BankForm) => void }) => (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2 flex flex-col gap-y-1">
        <Label size="small">Nombre del banco *</Label>
        <Input size="small" value={f.bank_name} onChange={(e) => set({ ...f, bank_name: e.target.value })} placeholder="Ej: Banco Industrial" />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="small">Número de cuenta *</Label>
        <Input size="small" value={f.account_number} onChange={(e) => set({ ...f, account_number: e.target.value })} placeholder="000-000000-00" />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="small">Tipo de cuenta</Label>
        <Input size="small" value={f.account_type} onChange={(e) => set({ ...f, account_type: e.target.value })} placeholder="Monetaria / Ahorro" />
      </div>
      <div className="col-span-2 flex flex-col gap-y-1">
        <Label size="small">Titular de la cuenta *</Label>
        <Input size="small" value={f.account_holder} onChange={(e) => set({ ...f, account_holder: e.target.value })} placeholder="Nombre del titular" />
      </div>
      <div className="col-span-2 flex flex-col gap-y-1">
        <Label size="small">URL del logo</Label>
        <Input size="small" value={f.logo_url} onChange={(e) => set({ ...f, logo_url: e.target.value })} placeholder="https://... (URL de R2)" />
      </div>
      <div className="col-span-2 flex flex-col gap-y-1">
        <Label size="small">Instrucciones adicionales</Label>
        <Textarea value={f.instructions} onChange={(e) => set({ ...f, instructions: e.target.value })} placeholder="Ej: Incluir nombre completo en la referencia" />
      </div>
      <div className="flex flex-col gap-y-1">
        <Label size="small">Orden</Label>
        <Input size="small" type="number" value={f.sort_order} onChange={(e) => set({ ...f, sort_order: e.target.value })} placeholder="0" />
      </div>
    </div>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Cuentas Bancarias</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {count} {count === 1 ? "cuenta registrada" : "cuentas registradas"} — aparecen en el checkout al elegir Depósito/Transferencia
          </p>
        </div>
        <Button size="small" variant={showCreate ? "secondary" : "primary"} onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancelar" : "+ Nueva Cuenta"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nueva Cuenta Bancaria</Heading>
          <FormFields f={form} set={setForm} />
          <div className="flex justify-end gap-x-2 mt-4">
            <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button size="small" isLoading={submitting} onClick={handleCreate}>Crear</Button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="px-6 py-4 bg-ui-bg-subtle border-l-4 border-ui-border-interactive">
          <Heading level="h3" className="mb-4">Editar Cuenta Bancaria</Heading>
          <FormFields f={editForm} set={setEditForm} />
          <div className="flex justify-end gap-x-2 mt-4">
            <Button size="small" variant="secondary" onClick={() => setEditingId(null)}>Cancelar</Button>
            <Button size="small" isLoading={editSaving} onClick={handleSaveEdit}>Guardar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando cuentas...</div>
      ) : banks.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay cuentas bancarias. Crea la primera con "+ Nueva Cuenta".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Logo</Table.HeaderCell>
              <Table.HeaderCell>Banco</Table.HeaderCell>
              <Table.HeaderCell>Cuenta</Table.HeaderCell>
              <Table.HeaderCell>Tipo</Table.HeaderCell>
              <Table.HeaderCell>Titular</Table.HeaderCell>
              <Table.HeaderCell>Orden</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {banks.map((b) => (
              <Table.Row key={b.id}>
                <Table.Cell>
                  {b.logo_url
                    ? <img src={b.logo_url} alt={b.bank_name} className="h-8 w-auto object-contain" />
                    : <span className="text-ui-fg-muted text-xs">Sin logo</span>}
                </Table.Cell>
                <Table.Cell className="font-medium">{b.bank_name}</Table.Cell>
                <Table.Cell className="font-mono text-sm">{b.account_number}</Table.Cell>
                <Table.Cell>{b.account_type}</Table.Cell>
                <Table.Cell>{b.account_holder}</Table.Cell>
                <Table.Cell className="text-center">{b.sort_order}</Table.Cell>
                <Table.Cell>
                  <Badge color={b.is_active ? "green" : "grey"} size="2xsmall">
                    {b.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-x-2 justify-end">
                    <Button size="small" variant="secondary" onClick={() => handleStartEdit(b)}>Editar</Button>
                    <Button size="small" variant="secondary" onClick={() => handleToggle(b)}>
                      {b.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button size="small" variant="danger" onClick={() => handleDelete(b)}>Eliminar</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Cuentas Bancarias",
  icon: CreditCard,
})

export default BanksPage
