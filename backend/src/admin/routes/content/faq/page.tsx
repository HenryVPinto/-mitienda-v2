import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
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
import { RichEditor } from "../../../components/rich-editor"

type FaqItem = {
  id: string
  question: string
  answer: string
  category: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

type FaqForm = {
  question: string
  answer: string
  category: string
  sort_order: string
}

const emptyForm = (): FaqForm => ({
  question: "",
  answer: "",
  category: "",
  sort_order: "0",
})

const FaqFields = ({
  f,
  set,
  editorKey,
}: {
  f: FaqForm
  set: (fn: (prev: FaqForm) => FaqForm) => void
  editorKey?: string
}) => (
  <>
    <div className="col-span-2 flex flex-col gap-y-1">
      <Label size="small">Pregunta *</Label>
      <Input
        size="small"
        value={f.question}
        onChange={(e) => set((p) => ({ ...p, question: e.target.value }))}
        placeholder="¿Cuánto tarda el envío?"
      />
    </div>
    <div className="col-span-2 flex flex-col gap-y-1">
      <Label size="small">Respuesta *</Label>
      <RichEditor
        key={editorKey}
        initialHtml={f.answer}
        onChange={(html) => set((p) => ({ ...p, answer: html }))}
        minHeight="120px"
        placeholder="Generalmente 2-3 días hábiles..."
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Categoría</Label>
      <Input
        size="small"
        value={f.category}
        onChange={(e) => set((p) => ({ ...p, category: e.target.value }))}
        placeholder="Envíos, Pagos, Devoluciones..."
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Orden</Label>
      <Input
        size="small"
        type="number"
        min="0"
        value={f.sort_order}
        onChange={(e) => set((p) => ({ ...p, sort_order: e.target.value }))}
      />
    </div>
  </>
)

const FaqPage = () => {
  const [items, setItems] = useState<FaqItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FaqForm>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<FaqForm>(emptyForm())

  const base = window.location.origin

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/cms/faq`, { credentials: "include" })
      const data = await res.json()
      setItems(data.faq_items ?? [])
    } catch {
      toast.error("Error al cargar preguntas")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const buildPayload = (f: FaqForm) => ({
    question: f.question,
    answer: f.answer,
    category: f.category || null,
    sort_order: parseInt(f.sort_order) || 0,
  })

  const handleCreate = async () => {
    if (!form.question.trim()) { toast.error("La pregunta es requerida"); return }
    if (!form.answer.trim()) { toast.error("La respuesta es requerida"); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/cms/faq`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) throw new Error()
      toast.success("Pregunta creada")
      setShowCreate(false)
      setForm(emptyForm())
      fetchItems()
    } catch {
      toast.error("Error al crear pregunta")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (item: FaqItem) => {
    setEditingId(item.id)
    setEditForm({
      question: item.question,
      answer: item.answer,
      category: item.category ?? "",
      sort_order: String(item.sort_order),
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.question.trim()) { toast.error("La pregunta es requerida"); return }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/cms/faq/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      })
      if (!res.ok) throw new Error()
      toast.success("Pregunta actualizada")
      setEditingId(null)
      fetchItems()
    } catch {
      toast.error("Error al actualizar")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (item: FaqItem) => {
    try {
      await fetch(`${base}/admin/cms/faq/${item.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      })
      toast.success(item.is_active ? "Pregunta desactivada" : "Pregunta activada")
      fetchItems()
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleDelete = async (item: FaqItem) => {
    if (!confirm(`¿Eliminar la pregunta "${item.question}"?`)) return
    try {
      await fetch(`${base}/admin/cms/faq/${item.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Pregunta eliminada")
      fetchItems()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Preguntas Frecuentes</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {items.length} {items.length === 1 ? "pregunta registrada" : "preguntas registradas"}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nueva Pregunta"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nueva Pregunta</Heading>
          <div className="grid grid-cols-2 gap-4">
            <FaqFields f={form} set={setForm} editorKey="new" />
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>
                Crear Pregunta
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando preguntas...</div>
      ) : items.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay preguntas. Crea la primera haciendo clic en "+ Nueva Pregunta".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Pregunta</Table.HeaderCell>
              <Table.HeaderCell>Categoría</Table.HeaderCell>
              <Table.HeaderCell>Orden</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.map((item) =>
              editingId === item.id ? (
                <Table.Row key={item.id} className="bg-ui-bg-subtle align-top">
                  <Table.Cell colSpan={4}>
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <FaqFields f={editForm} set={setEditForm} editorKey={`edit-${editingId}`} />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end pt-2">
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
                <Table.Row key={item.id}>
                  <Table.Cell>
                    <p className="font-medium">{item.question}</p>
                    <p className="text-xs text-ui-fg-subtle line-clamp-1">{item.answer}</p>
                  </Table.Cell>
                  <Table.Cell>
                    {item.category ? (
                      <Badge color="blue" size="2xsmall">{item.category}</Badge>
                    ) : (
                      <span className="text-ui-fg-muted text-xs">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-sm">{item.sort_order}</Table.Cell>
                  <Table.Cell>
                    <Badge color={item.is_active ? "green" : "grey"} size="2xsmall">
                      {item.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(item)}>
                        Editar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => handleToggle(item)}>
                        {item.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(item)}>
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
  label: "FAQ",
  icon: ChatBubbleLeftRight,
})

export default FaqPage
