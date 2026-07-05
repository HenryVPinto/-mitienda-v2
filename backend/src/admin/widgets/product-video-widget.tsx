import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, Input, Label, toast } from "@medusajs/ui"
import { useEffect, useState } from "react"

type Props = {
  data: { id: string; metadata?: Record<string, unknown> | null }
}

function detectPlatform(url: string): "youtube" | "tiktok" | null {
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube"
  if (/tiktok\.com/.test(url)) return "tiktok"
  return null
}

const ProductVideoWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin

  const [currentUrl, setCurrentUrl] = useState<string>("")
  const [inputUrl, setInputUrl] = useState<string>("")
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,metadata`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        const meta = d.product?.metadata ?? {}
        setMetadata(meta)
        const url = (meta.video_url as string) ?? ""
        setCurrentUrl(url)
        setInputUrl(url)
      })
      .catch(() => {})
  }, [productId])

  const handleSave = async () => {
    const url = inputUrl.trim()
    if (url && !detectPlatform(url)) {
      toast.error("Ingresa una URL válida de YouTube o TikTok")
      return
    }
    setSaving(true)
    try {
      const newMeta = { ...metadata }
      if (url) {
        newMeta.video_url = url
      } else {
        delete newMeta.video_url
      }
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: newMeta }),
      })
      if (!res.ok) throw new Error()
      setCurrentUrl(url)
      setMetadata(newMeta)
      setEditing(false)
      toast.success(url ? "Video guardado" : "Video eliminado")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const platform = currentUrl ? detectPlatform(currentUrl) : null

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Video del producto
        </Heading>
        {!editing && (
          <Button size="small" variant="transparent" onClick={() => { setInputUrl(currentUrl); setEditing(true) }}>
            {currentUrl ? "Cambiar" : "Agregar"}
          </Button>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        {editing ? (
          <>
            <div className="space-y-1">
              <Label size="small">URL de YouTube o TikTok</Label>
              <Input
                size="small"
                placeholder="https://www.youtube.com/watch?v=... o https://www.tiktok.com/..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
              />
              <p className="text-xs text-ui-fg-subtle">
                Pega la URL del video tal como aparece en el navegador
              </p>
            </div>
            <div className="flex gap-x-2">
              <Button size="small" isLoading={saving} onClick={handleSave}>
                Guardar
              </Button>
              <Button size="small" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              {currentUrl && (
                <Button
                  size="small"
                  variant="danger"
                  isLoading={saving}
                  onClick={() => { setInputUrl(""); handleSave() }}
                >
                  Quitar
                </Button>
              )}
            </div>
          </>
        ) : currentUrl ? (
          <div className="space-y-2">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              platform === "youtube" ? "bg-red-100 text-red-700" : "bg-gray-900 text-white"
            }`}>
              {platform === "youtube" ? "YouTube" : "TikTok"}
            </span>
            <p className="text-xs text-ui-fg-subtle truncate">{currentUrl}</p>
          </div>
        ) : (
          <p className="text-ui-fg-subtle text-sm">Sin video agregado</p>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.before",
})

export default ProductVideoWidget
