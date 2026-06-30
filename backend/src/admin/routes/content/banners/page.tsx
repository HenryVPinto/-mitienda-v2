import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo } from "@medusajs/icons"
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
import { useCallback, useEffect, useRef, useState } from "react"

type Banner = {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  link_url: string | null
  position: "HOME" | "CATEGORY" | "PROMO"
  sort_order: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
  created_at: string
}

type BannerForm = {
  title: string
  subtitle: string
  image_url: string
  link_url: string
  position: Banner["position"]
  sort_order: string
  starts_at: string
  ends_at: string
}

const POSITION_LABELS: Record<Banner["position"], string> = {
  HOME: "Inicio",
  CATEGORY: "Categoría",
  PROMO: "Promoción",
}

const POSITION_COLORS: Record<Banner["position"], "blue" | "orange" | "purple"> = {
  HOME: "blue",
  CATEGORY: "orange",
  PROMO: "purple",
}

const emptyForm = (): BannerForm => ({
  title: "",
  subtitle: "",
  image_url: "",
  link_url: "",
  position: "HOME",
  sort_order: "0",
  starts_at: "",
  ends_at: "",
})

const BannerFields = ({
  f,
  set,
  fileRef,
  isUploading,
  onImageChange,
}: {
  f: BannerForm
  set: (fn: (prev: BannerForm) => BannerForm) => void
  fileRef: React.RefObject<HTMLInputElement>
  isUploading: boolean
  onImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Título *</Label>
      <Input
        size="small"
        value={f.title}
        onChange={(e) => set((p) => ({ ...p, title: e.target.value }))}
        placeholder="Ej: Ofertas de temporada"
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Subtítulo</Label>
      <Input
        size="small"
        value={f.subtitle}
        onChange={(e) => set((p) => ({ ...p, subtitle: e.target.value }))}
        placeholder="Texto secundario opcional"
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Imagen *</Label>
      <div className="flex items-center gap-x-2">
        {f.image_url && (
          <img
            src={f.image_url}
            alt="preview"
            className="h-10 rounded border border-ui-border-base object-cover"
          />
        )}
        <Button
          size="small"
          variant="secondary"
          isLoading={isUploading}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          {f.image_url ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageChange}
        />
      </div>
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">URL destino</Label>
      <Input
        size="small"
        value={f.link_url}
        onChange={(e) => set((p) => ({ ...p, link_url: e.target.value }))}
        placeholder="/collections/ofertas"
      />
    </div>
    <div className="flex flex-col gap-y-1">
      <Label size="small">Posición</Label>
      <Select
        value={f.position}
        onValueChange={(v) => set((p) => ({ ...p, position: v as Banner["position"] }))}
      >
        <Select.Trigger><Select.Value /></Select.Trigger>
        <Select.Content>
          <Select.Item value="HOME">Inicio</Select.Item>
          <Select.Item value="CATEGORY">Categoría</Select.Item>
          <Select.Item value="PROMO">Promoción</Select.Item>
        </Select.Content>
      </Select>
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

const BannersPage = () => {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<BannerForm>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const [form, setForm] = useState<BannerForm>(emptyForm())

  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const base = window.location.origin

  const fetchBanners = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/cms/banners`, { credentials: "include" })
      const data = await res.json()
      setBanners(data.banners ?? [])
    } catch {
      toast.error("Error al cargar banners")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchBanners()
  }, [fetchBanners])

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("files", file)
    const res = await fetch(`${base}/admin/uploads`, {
      method: "POST",
      credentials: "include",
      body: formData,
    })
    if (!res.ok) throw new Error("Error al subir imagen")
    const data = await res.json()
    return data.files?.[0]?.url ?? null
  }

  const handleCreateImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadFile(file)
      if (url) { setForm((f) => ({ ...f, image_url: url })); toast.success("Imagen subida") }
    } catch { toast.error("Error al subir imagen") } finally { setUploading(false) }
  }

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setEditUploading(true)
    try {
      const url = await uploadFile(file)
      if (url) { setEditForm((f) => ({ ...f, image_url: url })); toast.success("Imagen subida") }
    } catch { toast.error("Error al subir imagen") } finally { setEditUploading(false) }
  }

  const buildPayload = (f: BannerForm) => ({
    title: f.title,
    subtitle: f.subtitle || null,
    image_url: f.image_url,
    link_url: f.link_url || null,
    position: f.position,
    sort_order: parseInt(f.sort_order) || 0,
    starts_at: f.starts_at || null,
    ends_at: f.ends_at || null,
  })

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error("El título es requerido"); return }
    if (!form.image_url) { toast.error("La imagen es requerida"); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/cms/banners`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      })
      if (!res.ok) throw new Error()
      toast.success("Banner creado")
      setShowCreate(false)
      setForm(emptyForm())
      fetchBanners()
    } catch { toast.error("Error al crear banner") } finally { setSubmitting(false) }
  }

  const handleStartEdit = (b: Banner) => {
    setEditingId(b.id)
    setEditForm({
      title: b.title,
      subtitle: b.subtitle ?? "",
      image_url: b.image_url,
      link_url: b.link_url ?? "",
      position: b.position,
      sort_order: String(b.sort_order),
      starts_at: b.starts_at ? b.starts_at.slice(0, 10) : "",
      ends_at: b.ends_at ? b.ends_at.slice(0, 10) : "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) { toast.error("El título es requerido"); return }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/cms/banners/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(editForm)),
      })
      if (!res.ok) throw new Error()
      toast.success("Banner actualizado")
      setEditingId(null)
      fetchBanners()
    } catch { toast.error("Error al actualizar banner") } finally { setEditSaving(false) }
  }

  const handleToggle = async (b: Banner) => {
    try {
      await fetch(`${base}/admin/cms/banners/${b.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !b.is_active }),
      })
      toast.success(b.is_active ? "Banner desactivado" : "Banner activado")
      fetchBanners()
    } catch { toast.error("Error al actualizar") }
  }

  const handleDelete = async (b: Banner) => {
    if (!confirm(`¿Eliminar el banner "${b.title}"?`)) return
    try {
      await fetch(`${base}/admin/cms/banners/${b.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Banner eliminado")
      fetchBanners()
    } catch { toast.error("Error al eliminar") }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Banners</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {banners.length} {banners.length === 1 ? "banner registrado" : "banners registrados"}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nuevo Banner"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nuevo Banner</Heading>
          <div className="grid grid-cols-2 gap-4">
            <BannerFields
              f={form}
              set={setForm}
              fileRef={createFileRef}
              isUploading={uploading}
              onImageChange={handleCreateImageChange}
            />
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>
                Crear Banner
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando banners...</div>
      ) : banners.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay banners. Crea el primero haciendo clic en "+ Nuevo Banner".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Imagen</Table.HeaderCell>
              <Table.HeaderCell>Título</Table.HeaderCell>
              <Table.HeaderCell>Posición</Table.HeaderCell>
              <Table.HeaderCell>Vigencia</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {banners.map((b) =>
              editingId === b.id ? (
                <Table.Row key={b.id} className="bg-ui-bg-subtle align-top">
                  <Table.Cell colSpan={5}>
                    <div className="grid grid-cols-2 gap-4 py-2">
                      <BannerFields
                        f={editForm}
                        set={setEditForm}
                        fileRef={editFileRef}
                        isUploading={editUploading}
                        onImageChange={handleEditImageChange}
                      />
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
                <Table.Row key={b.id}>
                  <Table.Cell>
                    <img
                      src={b.image_url}
                      alt={b.title}
                      className="h-10 w-20 object-cover rounded border border-ui-border-base"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <p className="font-medium">{b.title}</p>
                    {b.subtitle && <p className="text-xs text-ui-fg-subtle">{b.subtitle}</p>}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={POSITION_COLORS[b.position]} size="2xsmall">
                      {POSITION_LABELS[b.position]}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-xs text-ui-fg-subtle">
                    {b.starts_at || b.ends_at
                      ? `${b.starts_at ? new Date(b.starts_at).toLocaleDateString("es-GT") : "∞"} → ${b.ends_at ? new Date(b.ends_at).toLocaleDateString("es-GT") : "∞"}`
                      : "Sin límite"}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={b.is_active ? "green" : "grey"} size="2xsmall">
                      {b.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(b)}>
                        Editar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => handleToggle(b)}>
                        {b.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(b)}>
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
  label: "Banners",
  icon: Photo,
})

export default BannersPage
