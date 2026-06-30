import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Tag } from "@medusajs/icons"
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
import { useCallback, useEffect, useRef, useState } from "react"

type Brand = {
  id: string
  name: string
  handle: string
  description: string | null
  logo_url: string | null
  website_url: string | null
  is_active: boolean
  created_at: string
}

type CreateForm = {
  name: string
  handle: string
  website_url: string
  logo_url: string
}

type EditForm = {
  name: string
  handle: string
  website_url: string
  description: string
  logo_url: string
}

const autoHandle = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

const LogoPreview = ({ url }: { url: string | null }) => {
  if (!url) return <span className="text-ui-fg-muted text-xs">—</span>
  return (
    <img
      src={url}
      alt="logo"
      className="h-8 w-8 object-contain rounded border border-ui-border-base"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = "none"
      }}
    />
  )
}

const BrandsPage = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    handle: "",
    website_url: "",
    description: "",
    logo_url: "",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editUploading, setEditUploading] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: "",
    handle: "",
    website_url: "",
    logo_url: "",
  })

  const createFileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const base = window.location.origin

  const fetchBrands = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/brands`, { credentials: "include" })
      const data = await res.json()
      setBrands(data.brands ?? [])
      setCount(data.count ?? 0)
    } catch {
      toast.error("Error al cargar marcas")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

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

  const handleLogoChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "create" | "edit"
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const setter = target === "create" ? setUploading : setEditUploading
    setter(true)
    try {
      const url = await uploadFile(file)
      if (url) {
        if (target === "create") {
          setForm((f) => ({ ...f, logo_url: url }))
        } else {
          setEditForm((f) => ({ ...f, logo_url: url }))
        }
        toast.success("Imagen subida")
      }
    } catch {
      toast.error("Error al subir imagen")
    } finally {
      setter(false)
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim() || !form.handle.trim()) {
      toast.error("Nombre y handle son requeridos")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/brands`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          handle: form.handle,
          website_url: form.website_url || undefined,
          logo_url: form.logo_url || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Marca creada exitosamente")
      setShowCreate(false)
      setForm({ name: "", handle: "", website_url: "", logo_url: "" })
      fetchBrands()
    } catch (e: any) {
      toast.error(e.message || "Error al crear marca")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (brand: Brand) => {
    setEditingId(brand.id)
    setEditForm({
      name: brand.name,
      handle: brand.handle,
      website_url: brand.website_url ?? "",
      description: brand.description ?? "",
      logo_url: brand.logo_url ?? "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.handle.trim()) {
      toast.error("Nombre y handle son requeridos")
      return
    }
    setEditSaving(true)
    try {
      const res = await fetch(`${base}/admin/brands/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          handle: editForm.handle,
          website_url: editForm.website_url || null,
          description: editForm.description || null,
          logo_url: editForm.logo_url || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al guardar")
      }
      toast.success("Marca actualizada")
      setEditingId(null)
      fetchBrands()
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar marca")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (brand: Brand) => {
    try {
      const res = await fetch(`${base}/admin/brands/${brand.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !brand.is_active }),
      })
      if (!res.ok) throw new Error()
      toast.success(brand.is_active ? "Marca desactivada" : "Marca activada")
      fetchBrands()
    } catch {
      toast.error("Error al actualizar marca")
    }
  }

  const handleDelete = async (brand: Brand) => {
    if (!confirm(`¿Eliminar la marca "${brand.name}"? Esta acción no se puede deshacer.`))
      return
    try {
      await fetch(`${base}/admin/brands/${brand.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Marca eliminada")
      fetchBrands()
    } catch {
      toast.error("Error al eliminar marca")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Marcas</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1">
            {count} {count === 1 ? "marca registrada" : "marcas registradas"}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nueva Marca"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">Nueva Marca</Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="brand-name" size="small">Nombre *</Label>
              <Input
                id="brand-name"
                size="small"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    handle: autoHandle(e.target.value),
                  }))
                }
                placeholder="Ej: Samsung"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="brand-handle" size="small">Handle *</Label>
              <Input
                id="brand-handle"
                size="small"
                value={form.handle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, handle: e.target.value }))
                }
                placeholder="Ej: samsung"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="brand-url" size="small">Sitio Web</Label>
              <Input
                id="brand-url"
                size="small"
                value={form.website_url}
                onChange={(e) =>
                  setForm((f) => ({ ...f, website_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label size="small">Logo</Label>
              <div className="flex items-center gap-x-3">
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="preview"
                    className="h-10 w-10 object-contain rounded border border-ui-border-base"
                  />
                )}
                <input
                  ref={createFileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleLogoChange(e, "create")}
                />
                <Button
                  size="small"
                  variant="secondary"
                  isLoading={uploading}
                  onClick={() => createFileRef.current?.click()}
                >
                  {form.logo_url ? "Cambiar imagen" : "Subir imagen"}
                </Button>
                {form.logo_url && (
                  <Button
                    size="small"
                    variant="transparent"
                    onClick={() => setForm((f) => ({ ...f, logo_url: "" }))}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>
            <div className="col-span-2 flex justify-end gap-x-2">
              <Button size="small" variant="secondary" onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button size="small" isLoading={submitting} onClick={handleCreate}>
                Crear Marca
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">Cargando marcas...</div>
      ) : brands.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay marcas registradas. Crea la primera haciendo clic en "+ Nueva Marca".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Logo</Table.HeaderCell>
              <Table.HeaderCell>Nombre</Table.HeaderCell>
              <Table.HeaderCell>Handle</Table.HeaderCell>
              <Table.HeaderCell>Sitio Web</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Creado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {brands.map((brand) =>
              editingId === brand.id ? (
                <Table.Row key={brand.id} className="bg-ui-bg-subtle">
                  <Table.Cell>
                    <div className="flex flex-col items-center gap-y-1">
                      {editForm.logo_url && (
                        <img
                          src={editForm.logo_url}
                          alt="logo"
                          className="h-10 w-10 object-contain rounded border border-ui-border-base"
                        />
                      )}
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleLogoChange(e, "edit")}
                      />
                      <Button
                        size="small"
                        variant="transparent"
                        isLoading={editUploading}
                        onClick={() => editFileRef.current?.click()}
                      >
                        {editForm.logo_url ? "Cambiar" : "Subir"}
                      </Button>
                    </div>
                  </Table.Cell>
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
                      value={editForm.handle}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, handle: e.target.value }))
                      }
                      placeholder="handle"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      value={editForm.website_url}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, website_url: e.target.value }))
                      }
                      placeholder="https://..."
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={brand.is_active ? "green" : "grey"} size="2xsmall">
                      {brand.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle text-sm">
                    {new Date(brand.created_at).toLocaleDateString("es-GT")}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
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
                <Table.Row key={brand.id}>
                  <Table.Cell>
                    <LogoPreview url={brand.logo_url} />
                  </Table.Cell>
                  <Table.Cell className="font-medium">{brand.name}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle font-mono text-xs">
                    {brand.handle}
                  </Table.Cell>
                  <Table.Cell>
                    {brand.website_url ? (
                      <a
                        href={brand.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-ui-fg-interactive hover:underline text-sm"
                      >
                        {brand.website_url}
                      </a>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Badge color={brand.is_active ? "green" : "grey"} size="2xsmall">
                      {brand.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle text-sm">
                    {new Date(brand.created_at).toLocaleDateString("es-GT")}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button size="small" variant="secondary" onClick={() => handleStartEdit(brand)}>
                        Editar
                      </Button>
                      <Button size="small" variant="secondary" onClick={() => handleToggle(brand)}>
                        {brand.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button size="small" variant="danger" onClick={() => handleDelete(brand)}>
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
  label: "Marcas",
  icon: Tag,
})

export default BrandsPage
