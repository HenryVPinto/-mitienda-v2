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

type BrandCatalog = {
  id: string
  brand_id: string
  title: string
  description: string | null
  file_url: string
  cover_image_url: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

type CatalogForm = {
  title: string
  description: string
  file_url: string
  cover_image_url: string
}

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

  // Catalog state
  const [catalogBrandId, setCatalogBrandId] = useState<string | null>(null)
  const [catalogs, setCatalogs] = useState<BrandCatalog[]>([])
  const [catalogsLoading, setCatalogsLoading] = useState(false)
  const [showCatalogCreate, setShowCatalogCreate] = useState(false)
  const [catalogForm, setCatalogForm] = useState<CatalogForm>({ title: "", description: "", file_url: "", cover_image_url: "" })
  const [catalogSubmitting, setCatalogSubmitting] = useState(false)
  const [catalogUploading, setCatalogUploading] = useState(false)
  const [catalogCoverUploading, setCatalogCoverUploading] = useState(false)
  const catalogPdfRef = useRef<HTMLInputElement>(null)
  const catalogCoverRef = useRef<HTMLInputElement>(null)

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

  const fetchCatalogs = useCallback(async (brandId: string) => {
    setCatalogsLoading(true)
    try {
      const res = await fetch(`${base}/admin/brands/${brandId}/catalogs`, { credentials: "include" })
      const data = await res.json()
      setCatalogs(data.catalogs ?? [])
    } catch {
      toast.error("Error al cargar catálogos")
    } finally {
      setCatalogsLoading(false)
    }
  }, [base])

  const handleOpenCatalogs = (brand: Brand) => {
    setCatalogBrandId(brand.id)
    setShowCatalogCreate(false)
    setCatalogForm({ title: "", description: "", file_url: "", cover_image_url: "" })
    fetchCatalogs(brand.id)
  }

  const handleCloseCatalogs = () => {
    setCatalogBrandId(null)
    setCatalogs([])
    setShowCatalogCreate(false)
  }

  const uploadPdf = async (file: File): Promise<string | null> => {
    const formData = new FormData()
    formData.append("files", file)
    const res = await fetch(`${base}/admin/uploads`, {
      method: "POST",
      credentials: "include",
      body: formData,
    })
    if (!res.ok) throw new Error("Error al subir archivo")
    const data = await res.json()
    return data.files?.[0]?.url ?? null
  }

  const handlePdfChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCatalogUploading(true)
    try {
      const url = await uploadPdf(file)
      if (url) setCatalogForm((f) => ({ ...f, file_url: url }))
      toast.success("PDF subido")
    } catch {
      toast.error("Error al subir PDF")
    } finally {
      setCatalogUploading(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCatalogCoverUploading(true)
    try {
      const url = await uploadFile(file)
      if (url) setCatalogForm((f) => ({ ...f, cover_image_url: url }))
      toast.success("Portada subida")
    } catch {
      toast.error("Error al subir portada")
    } finally {
      setCatalogCoverUploading(false)
    }
  }

  const handleCreateCatalog = async () => {
    if (!catalogForm.title.trim() || !catalogForm.file_url) {
      toast.error("Título y PDF son requeridos")
      return
    }
    setCatalogSubmitting(true)
    try {
      const res = await fetch(`${base}/admin/brands/${catalogBrandId}/catalogs`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: catalogForm.title,
          description: catalogForm.description || null,
          file_url: catalogForm.file_url,
          cover_image_url: catalogForm.cover_image_url || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success("Catálogo creado")
      setShowCatalogCreate(false)
      setCatalogForm({ title: "", description: "", file_url: "", cover_image_url: "" })
      fetchCatalogs(catalogBrandId!)
    } catch {
      toast.error("Error al crear catálogo")
    } finally {
      setCatalogSubmitting(false)
    }
  }

  const handleDeleteCatalog = async (catalogId: string) => {
    if (!confirm("¿Eliminar este catálogo?")) return
    try {
      await fetch(`${base}/admin/brands/${catalogBrandId}/catalogs/${catalogId}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Catálogo eliminado")
      fetchCatalogs(catalogBrandId!)
    } catch {
      toast.error("Error al eliminar catálogo")
    }
  }

  const catalogBrand = brands.find((b) => b.id === catalogBrandId)

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
                      <Button size="small" variant="secondary" onClick={() => handleOpenCatalogs(brand)}>
                        Catálogos
                      </Button>
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

      {/* Panel de catálogos */}
      {catalogBrandId && catalogBrand && (
        <div className="border-t border-ui-border-base">
          <div className="px-6 py-4 flex items-center justify-between bg-ui-bg-subtle">
            <div>
              <Heading level="h3">Catálogos PDF — {catalogBrand.name}</Heading>
              <p className="text-ui-fg-subtle txt-small mt-0.5">{catalogs.length} catálogo{catalogs.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex items-center gap-x-2">
              <Button
                size="small"
                variant={showCatalogCreate ? "secondary" : "primary"}
                onClick={() => setShowCatalogCreate((v) => !v)}
              >
                {showCatalogCreate ? "Cancelar" : "+ Nuevo catálogo"}
              </Button>
              <Button size="small" variant="transparent" onClick={handleCloseCatalogs}>
                Cerrar
              </Button>
            </div>
          </div>

          {showCatalogCreate && (
            <div className="px-6 py-4 border-b border-ui-border-base bg-white">
              <div className="grid grid-cols-2 gap-4 max-w-2xl">
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Título *</Label>
                  <Input
                    size="small"
                    value={catalogForm.title}
                    onChange={(e) => setCatalogForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Ej: Catálogo 2024"
                  />
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Descripción</Label>
                  <Input
                    size="small"
                    value={catalogForm.description}
                    onChange={(e) => setCatalogForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Archivo PDF *</Label>
                  <div className="flex items-center gap-x-2">
                    <input ref={catalogPdfRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfChange} />
                    <Button size="small" variant="secondary" isLoading={catalogUploading} onClick={() => catalogPdfRef.current?.click()}>
                      {catalogForm.file_url ? "PDF cargado ✓" : "Subir PDF"}
                    </Button>
                    {catalogForm.file_url && (
                      <a href={catalogForm.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-ui-fg-interactive hover:underline">
                        Ver PDF
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-y-1">
                  <Label size="small">Imagen de portada</Label>
                  <div className="flex items-center gap-x-2">
                    {catalogForm.cover_image_url && (
                      <img src={catalogForm.cover_image_url} alt="portada" className="h-8 w-8 object-cover rounded border border-ui-border-base" />
                    )}
                    <input ref={catalogCoverRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                    <Button size="small" variant="secondary" isLoading={catalogCoverUploading} onClick={() => catalogCoverRef.current?.click()}>
                      {catalogForm.cover_image_url ? "Cambiar" : "Subir portada"}
                    </Button>
                  </div>
                </div>
                <div className="col-span-2 flex justify-end gap-x-2">
                  <Button size="small" variant="secondary" onClick={() => setShowCatalogCreate(false)}>Cancelar</Button>
                  <Button size="small" isLoading={catalogSubmitting} onClick={handleCreateCatalog}>Guardar catálogo</Button>
                </div>
              </div>
            </div>
          )}

          {catalogsLoading ? (
            <div className="px-6 py-6 text-center text-ui-fg-subtle">Cargando catálogos...</div>
          ) : catalogs.length === 0 ? (
            <div className="px-6 py-6 text-center text-ui-fg-subtle">No hay catálogos para esta marca. Agrega el primero.</div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Portada</Table.HeaderCell>
                  <Table.HeaderCell>Título</Table.HeaderCell>
                  <Table.HeaderCell>Descripción</Table.HeaderCell>
                  <Table.HeaderCell>PDF</Table.HeaderCell>
                  <Table.HeaderCell>Estado</Table.HeaderCell>
                  <Table.HeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {catalogs.map((catalog) => (
                  <Table.Row key={catalog.id}>
                    <Table.Cell>
                      {catalog.cover_image_url ? (
                        <img src={catalog.cover_image_url} alt="portada" className="h-10 w-8 object-cover rounded border border-ui-border-base" />
                      ) : (
                        <span className="text-ui-fg-muted text-xs">—</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="font-medium">{catalog.title}</Table.Cell>
                    <Table.Cell className="text-ui-fg-subtle text-sm">{catalog.description ?? "—"}</Table.Cell>
                    <Table.Cell>
                      <a href={catalog.file_url} target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive hover:underline text-sm">
                        Ver PDF
                      </a>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={catalog.is_active ? "green" : "grey"} size="2xsmall">
                        {catalog.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex items-center gap-x-2 justify-end">
                        <Button size="small" variant="danger" onClick={() => handleDeleteCatalog(catalog.id)}>
                          Eliminar
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Marcas",
  icon: Tag,
})

export default BrandsPage
