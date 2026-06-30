import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUpCircleSolid, BuildingStorefront } from "@medusajs/icons"
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
import { useCallback, useEffect, useRef, useState } from "react"

type Vendor = {
  id: string
  name: string
  handle: string
  description: string | null
  logo_url: string | null
  contact_email: string | null
  contact_phone: string | null
  city: string | null
  country_code: string
  commission_rate: number | null
  is_active: boolean
  metadata: Record<string, unknown> | null
  created_at: string
}

type CreateForm = {
  name: string
  handle: string
  description: string
  logo_url: string
  contact_email: string
  contact_phone: string
  city: string
  commission_rate: string
}

type EditForm = {
  name: string
  handle: string
  description: string
  logo_url: string
  contact_email: string
  contact_phone: string
  city: string
  commission_rate: string
}

const autoHandle = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")

function VendorAvatarUpload({
  value,
  onChange,
}: {
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const base = window.location.origin

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("files", file)
      const res = await fetch(`${base}/admin/uploads`, {
        method: "POST",
        credentials: "include",
        body: fd,
      })
      if (!res.ok) throw new Error("Upload failed")
      const data = await res.json()
      const url = data.files?.[0]?.url
      if (url) onChange(url)
      else throw new Error("No URL returned")
    } catch {
      toast.error("Error al subir la imagen")
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ""
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative w-16 h-16 rounded-full border-2 border-ui-border-base overflow-hidden flex-shrink-0 cursor-pointer group bg-ui-bg-subtle"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ui-fg-muted">
            <ArrowUpCircleSolid className="w-6 h-6" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
          <ArrowUpCircleSolid className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex flex-col gap-y-1">
        <Button
          size="small"
          variant="secondary"
          type="button"
          isLoading={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Subiendo..." : value ? "Cambiar foto" : "Subir foto"}
        </Button>
        {value && (
          <button
            type="button"
            className="text-ui-fg-error txt-small text-left"
            onClick={() => onChange("")}
          >
            Quitar foto
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}

const VendorsPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    handle: "",
    description: "",
    logo_url: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    commission_rate: "",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [form, setForm] = useState<CreateForm>({
    name: "",
    handle: "",
    description: "",
    logo_url: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    commission_rate: "",
  })

  const base = window.location.origin

  const fetchVendors = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${base}/admin/vendors`, {
        credentials: "include",
      })
      const data = await res.json()
      setVendors(data.vendors ?? [])
      setCount(data.count ?? 0)
    } catch {
      toast.error("Error al cargar vendors")
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    fetchVendors()
  }, [fetchVendors])

  const handleCreate = async () => {
    if (!form.name.trim() || !form.handle.trim()) {
      toast.error("Nombre y handle son requeridos")
      return
    }
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        handle: form.handle,
        description: form.description || null,
        logo_url: form.logo_url || null,
        city: form.city || undefined,
        contact_email: form.contact_email || undefined,
        contact_phone: form.contact_phone || undefined,
      }
      if (form.commission_rate) {
        payload.commission_rate = parseFloat(form.commission_rate)
      }
      const res = await fetch(`${base}/admin/vendors`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al crear")
      }
      toast.success("Vendor creado exitosamente")
      setShowCreate(false)
      setForm({
        name: "",
        handle: "",
        description: "",
        logo_url: "",
        contact_email: "",
        contact_phone: "",
        city: "",
        commission_rate: "",
      })
      fetchVendors()
    } catch (e: any) {
      toast.error(e.message || "Error al crear vendor")
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEdit = (vendor: Vendor) => {
    setEditingId(vendor.id)
    setEditForm({
      name: vendor.name,
      handle: vendor.handle,
      description: vendor.description ?? "",
      logo_url: vendor.logo_url ?? "",
      contact_email: vendor.contact_email ?? "",
      contact_phone: vendor.contact_phone ?? "",
      city: vendor.city ?? "",
      commission_rate:
        vendor.commission_rate !== null ? String(vendor.commission_rate) : "",
    })
  }

  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.handle.trim()) {
      toast.error("Nombre y handle son requeridos")
      return
    }
    setEditSaving(true)
    try {
      const payload: Record<string, unknown> = {
        name: editForm.name,
        handle: editForm.handle,
        description: editForm.description || null,
        logo_url: editForm.logo_url || null,
        contact_email: editForm.contact_email || null,
        contact_phone: editForm.contact_phone || null,
        city: editForm.city || null,
        commission_rate: editForm.commission_rate
          ? parseFloat(editForm.commission_rate)
          : null,
      }
      const res = await fetch(`${base}/admin/vendors/${editingId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || "Error al guardar")
      }
      toast.success("Vendor actualizado")
      setEditingId(null)
      fetchVendors()
    } catch (e: any) {
      toast.error(e.message || "Error al actualizar vendor")
    } finally {
      setEditSaving(false)
    }
  }

  const handleToggle = async (vendor: Vendor) => {
    const activating = !vendor.is_active
    try {
      const body: Record<string, unknown> = { is_active: activating }
      // When approving a pending application, clear the pending status
      if (activating && vendor.metadata?.status === "pending") {
        body.metadata = { ...vendor.metadata, status: "active" }
      }
      const res = await fetch(`${base}/admin/vendors/${vendor.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      toast.success(
        vendor.is_active ? "Vendor desactivado" :
        vendor.metadata?.status === "pending" ? "Solicitud aprobada" : "Vendor activado"
      )
      fetchVendors()
    } catch {
      toast.error("Error al actualizar vendor")
    }
  }

  const handleDelete = async (vendor: Vendor) => {
    if (
      !confirm(
        `¿Eliminar el vendor "${vendor.name}"? Esta acción no se puede deshacer.`
      )
    )
      return
    try {
      await fetch(`${base}/admin/vendors/${vendor.id}`, {
        method: "DELETE",
        credentials: "include",
      })
      toast.success("Vendor eliminado")
      fetchVendors()
    } catch {
      toast.error("Error al eliminar vendor")
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Vendors</Heading>
          <p className="text-ui-fg-subtle txt-small mt-1 flex items-center gap-x-2">
            <span>{count} {count === 1 ? "vendor registrado" : "vendors registrados"}</span>
            {vendors.filter((v) => v.metadata?.status === "pending").length > 0 && (
              <Badge color="orange" size="2xsmall">
                {vendors.filter((v) => v.metadata?.status === "pending").length} solicitud
                {vendors.filter((v) => v.metadata?.status === "pending").length > 1 ? "es" : ""} pendiente
                {vendors.filter((v) => v.metadata?.status === "pending").length > 1 ? "s" : ""}
              </Badge>
            )}
          </p>
        </div>
        <Button
          size="small"
          variant={showCreate ? "secondary" : "primary"}
          onClick={() => setShowCreate(!showCreate)}
        >
          {showCreate ? "Cancelar" : "+ Nuevo Vendor"}
        </Button>
      </div>

      {showCreate && (
        <div className="px-6 py-4 bg-ui-bg-subtle">
          <Heading level="h3" className="mb-4">
            Nuevo Vendor
          </Heading>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-name" size="small">
                Nombre *
              </Label>
              <Input
                id="vendor-name"
                size="small"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    handle: autoHandle(e.target.value),
                  }))
                }
                placeholder="Ej: Distribuidora Central"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-handle" size="small">
                Handle *
              </Label>
              <Input
                id="vendor-handle"
                size="small"
                value={form.handle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, handle: e.target.value }))
                }
                placeholder="Ej: distribuidora-central"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-y-1">
              <Label size="small">Foto de Perfil</Label>
              <VendorAvatarUpload
                value={form.logo_url}
                onChange={(url) => setForm((f) => ({ ...f, logo_url: url }))}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-y-1">
              <Label htmlFor="vendor-description" size="small">
                Descripción
              </Label>
              <Textarea
                id="vendor-description"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Breve descripción del vendedor o tienda..."
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-email" size="small">
                Correo de Contacto
              </Label>
              <Input
                id="vendor-email"
                size="small"
                type="email"
                value={form.contact_email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_email: e.target.value }))
                }
                placeholder="contacto@empresa.com"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-phone" size="small">
                Teléfono
              </Label>
              <Input
                id="vendor-phone"
                size="small"
                value={form.contact_phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, contact_phone: e.target.value }))
                }
                placeholder="+502 2222-3333"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-city" size="small">
                Ciudad
              </Label>
              <Input
                id="vendor-city"
                size="small"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                placeholder="Guatemala"
              />
            </div>
            <div className="flex flex-col gap-y-1">
              <Label htmlFor="vendor-commission" size="small">
                Comisión (%)
              </Label>
              <Input
                id="vendor-commission"
                size="small"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={form.commission_rate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commission_rate: e.target.value }))
                }
                placeholder="5"
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
                Crear Vendor
              </Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          Cargando vendors...
        </div>
      ) : vendors.length === 0 ? (
        <div className="px-6 py-8 text-center text-ui-fg-subtle">
          No hay vendors registrados. Crea el primero haciendo clic en "+ Nuevo Vendor".
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Nombre / Handle</Table.HeaderCell>
              <Table.HeaderCell>Ciudad</Table.HeaderCell>
              <Table.HeaderCell>Contacto</Table.HeaderCell>
              <Table.HeaderCell>Comisión</Table.HeaderCell>
              <Table.HeaderCell>Estado</Table.HeaderCell>
              <Table.HeaderCell>Creado</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {vendors.map((vendor) =>
              editingId === vendor.id ? (
                <Table.Row key={vendor.id} className="bg-ui-bg-subtle">
                  <Table.Cell>
                    <div className="flex flex-col gap-y-1">
                      <Input
                        size="small"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, name: e.target.value }))
                        }
                        placeholder="Nombre"
                      />
                      <Input
                        size="small"
                        value={editForm.handle}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, handle: e.target.value }))
                        }
                        placeholder="handle"
                      />
                      <VendorAvatarUpload
                        value={editForm.logo_url}
                        onChange={(url) => setEditForm((f) => ({ ...f, logo_url: url }))}
                      />
                      <Textarea
                        value={editForm.description}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, description: e.target.value }))
                        }
                        placeholder="Descripción"
                        rows={2}
                      />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      value={editForm.city}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, city: e.target.value }))
                      }
                      placeholder="Ciudad"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex flex-col gap-y-1">
                      <Input
                        size="small"
                        type="email"
                        value={editForm.contact_email}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contact_email: e.target.value,
                          }))
                        }
                        placeholder="email"
                      />
                      <Input
                        size="small"
                        value={editForm.contact_phone}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            contact_phone: e.target.value,
                          }))
                        }
                        placeholder="teléfono"
                      />
                    </div>
                  </Table.Cell>
                  <Table.Cell>
                    <Input
                      size="small"
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editForm.commission_rate}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          commission_rate: e.target.value,
                        }))
                      }
                      placeholder="%"
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      color={vendor.is_active ? "green" : "grey"}
                      size="2xsmall"
                    >
                      {vendor.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle text-sm">
                    {new Date(vendor.created_at).toLocaleDateString("es-GT")}
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
                <Table.Row key={vendor.id}>
                  <Table.Cell>
                    <div>
                      <p className="font-medium">{vendor.name}</p>
                      <p className="text-ui-fg-subtle font-mono text-xs">
                        {vendor.handle}
                      </p>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">
                    {vendor.city ?? <span className="text-ui-fg-muted">—</span>}
                  </Table.Cell>
                  <Table.Cell>
                    {vendor.contact_email ? (
                      <div className="text-sm">
                        <p>{vendor.contact_email}</p>
                        {vendor.contact_phone && (
                          <p className="text-ui-fg-subtle">
                            {vendor.contact_phone}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {vendor.commission_rate !== null ? (
                      <Badge color="blue" size="2xsmall">
                        {vendor.commission_rate}%
                      </Badge>
                    ) : (
                      <span className="text-ui-fg-muted">—</span>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {vendor.is_active ? (
                      <Badge color="green" size="2xsmall">Activo</Badge>
                    ) : vendor.metadata?.status === "pending" ? (
                      <Badge color="orange" size="2xsmall">Solicitud</Badge>
                    ) : (
                      <Badge color="grey" size="2xsmall">Inactivo</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle text-sm">
                    {new Date(vendor.created_at).toLocaleDateString("es-GT")}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-x-2 justify-end">
                      <Button
                        size="small"
                        variant="secondary"
                        onClick={() => handleStartEdit(vendor)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        variant={vendor.metadata?.status === "pending" ? "primary" : "secondary"}
                        onClick={() => handleToggle(vendor)}
                      >
                        {vendor.is_active ? "Desactivar" : vendor.metadata?.status === "pending" ? "Aprobar" : "Activar"}
                      </Button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDelete(vendor)}
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
  label: "Vendors",
  icon: BuildingStorefront,
})

export default VendorsPage
