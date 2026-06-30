import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
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

type Page = {
  id: string
  slug: string
  title: string
  content: string
  is_published: boolean
  created_at: string
}

type PageForm = {
  slug: string
  title: string
  content: string
}

const emptyForm = (): PageForm => ({
  slug: "",
  title: "",
  content: "",
})

const autoSlug = (title: string) =>
  title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

const PageFields = ({
  f,
  set,
  showSlug = true,
  editorKey,
}: {
  f: PageForm
  set: (fn: (prev: PageForm) => PageForm) => void
  showSlug?: boolean
  editorKey?: string
}) => (
  <>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Título *</Label>
      <Input
        size="small"
        value={f.title}
        onChange={(e) => {
          const title = e.target.value
          set((p) => ({
            ...p,
            title,
            slug: p.slug || autoSlug(title),
          }))
        }}
        placeholder="Términos y Condiciones"
      />
    </div>
    {showSlug && (
      <div className="flex flex-col gap-y-1">
        <Label size="small">Slug *</Label>
        <Input
          size="small"
          value={f.slug}
          onChange={(e) => set((p) => ({ ...p, slug: e.target.value }))}
          placeholder="terminos-y-condiciones"
        />
      </div>
    )}
    <div className="col-span-2 flex flex-col gap-y-1">
      <Label size="small">Contenido</Label>
      <RichEditor
        key={editorKey}
        initialHtml={f.content}
        onChange={(html) => set((p) => ({ ...p, content: html }))}
        minHeight="220px"
        placeholder="Escribe el contenido de la página..."
      />
    </div>
  </>
)

const PagesPage = () => {
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PageForm>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<PageForm>(emptyForm())

  const base = window.location.origin

  const fetchPages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/cms/pages`, { credentials: "include" })
      const data = await res.json()
      setPages(data.pages ?? [])
    } catch {
      toast.error("Error al cargar páginas")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchPages()
  }, [fetchPages])

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("El título es requerido"); return }
    if (!form.slug.trim()) { toast.error("El slug es requerido"); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/cms/pages`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          slug: form.slug,
          content: form.content,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Página creada")
      setShowCreate(false)
      setForm(emptyForm())
      fetchPages()
    } catch (e: any) {
      toast.error(e.message || "Error al crear página")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (p: Page) => {
    setEditingId(p.id)
    setEditForm({ slug: p.slug, title: p.title, content: p.content })
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) { toast.error("El título es requerido"); return }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/cms/pages/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          slug: editForm.slug,
          content: editForm.content,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Página actualizada")
      setEditingId(null)
      fetchPages()
    } catch {
      toast.error("Error al actualizar página")
    } finally {
      setEditSaving(false)
    }
  }

  const handleTogglePublish = async (p: Page) => {
    try {
      await fetch(`${base}/admin/cms/pages/${p.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_published: !p.is_published }),
      })
      toast.success(p.is_published ? "Página despublicada" : "Página publicada")
      fetchPages()
    } catch {
      toast.error("Error al actualizar")
    }
  }

  const handleDelete = async (p: Page) => {
    if (!confirm(`¿Eliminar la página "${p.title}"?`)) return
    try {
      await fetch(`${base}/admin/cms/pages/${p.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Página eliminada")
      fetchPages()
    } catch {
      toast.error("Error al eliminar")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Páginas</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {pages.length} {pages.length === 1 ? "página registrada" : "páginas registradas"}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nueva Página"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nueva Página</Heading>
          <div className="grid grid-cols-2 gap-4">
            <PageFields f={form} set={setForm} editorKey="new" />
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>
                Crear Página
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando páginas...</div>
      ) : pages.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay páginas. Crea la primera haciendo clic en "+ Nueva Página".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Título</Table.HeaderCell>
              <Table.HeaderCell>Slug</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pages.map((p) =>
              editingId === p.id ? (
                <Table.Row key={p.id} className="bg-ui-bg-subtle align-top">
                  <Table.Cell colSpan={3}>
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <PageFields f={editForm} set={setEditForm} showSlug={false} editorKey={`edit-${editingId}`} />
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
                <Table.Row key={p.id}>
                  <Table.Cell>
                    <p className="font-medium">{p.title}</p>
                  </Table.Cell>
                  <Table.Cell>
                    <code className="text-xs bg-ui-bg-subtle px-1 py-0.5 rounded">{p.slug}</code>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={p.is_published ? "green" : "grey"} size="2xsmall">
                      {p.is_published ? "Publicada" : "Borrador"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(p)}>
                        Editar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => handleTogglePublish(p)}>
                        {p.is_published ? "Despublicar" : "Publicar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(p)}>
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
  label: "Páginas",
  icon: DocumentText,
})

export default PagesPage
