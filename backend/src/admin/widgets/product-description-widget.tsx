import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Button, Container, Heading, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"

type Props = {
  data: { id: string }
}

function ToolbarBtn({
  cmd,
  arg,
  title,
  children,
  onClick,
}: {
  cmd?: string
  arg?: string
  title: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onClick) { onClick(); return }
    if (cmd) document.execCommand(cmd, false, arg)
  }
  return (
    <button
      type="button"
      onMouseDown={handleMouseDown}
      title={title}
      className="px-2 py-1 text-xs rounded border bg-ui-bg-base text-ui-fg-base border-ui-border-base hover:bg-ui-bg-base-hover transition-colors select-none"
    >
      {children}
    </button>
  )
}

const ProductDescriptionWidget = ({ data }: Props) => {
  const productId = data.id
  const base = window.location.origin
  const editorRef = useRef<HTMLDivElement>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${base}/admin/products/${productId}?fields=id,description`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => {
        if (editorRef.current) {
          editorRef.current.innerHTML = d.product?.description ?? ""
        }
      })
      .catch(() => {})
  }, [productId])

  const handleSave = async () => {
    if (!editorRef.current) return
    setSaving(true)
    try {
      const res = await fetch(`${base}/admin/products/${productId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editorRef.current.innerHTML }),
      })
      if (!res.ok) throw new Error()
      toast.success("Descripción guardada")
    } catch {
      toast.error("Error al guardar")
    } finally {
      setSaving(false)
    }
  }

  const insertImage = () => {
    const url = window.prompt("URL de la imagen:")
    if (!url) return
    editorRef.current?.focus()
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
    )
  }

  const insertLink = () => {
    const url = window.prompt("URL del enlace:")
    if (!url) return
    document.execCommand("createLink", false, url)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Descripción del producto
        </Heading>
        <Button size="small" isLoading={saving} onClick={handleSave}>
          Guardar
        </Button>
      </div>

      <div className="px-3 py-2 flex flex-wrap gap-1 bg-ui-bg-subtle">
        <ToolbarBtn cmd="bold" title="Negrita"><strong>B</strong></ToolbarBtn>
        <ToolbarBtn cmd="italic" title="Cursiva"><em>I</em></ToolbarBtn>
        <ToolbarBtn cmd="underline" title="Subrayado"><u>U</u></ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn cmd="formatBlock" arg="h2" title="Título">H2</ToolbarBtn>
        <ToolbarBtn cmd="formatBlock" arg="h3" title="Subtítulo">H3</ToolbarBtn>
        <ToolbarBtn cmd="formatBlock" arg="p" title="Párrafo">¶</ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn cmd="insertUnorderedList" title="Lista con viñetas">• Lista</ToolbarBtn>
        <ToolbarBtn cmd="insertOrderedList" title="Lista numerada">1. Lista</ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn title="Insertar enlace" onClick={insertLink}>🔗 Enlace</ToolbarBtn>
        <ToolbarBtn title="Insertar imagen" onClick={insertImage}>🖼 Imagen</ToolbarBtn>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-40 px-4 py-3 text-sm text-ui-fg-base focus:outline-none"
        style={{ lineHeight: "1.7" }}
      />

      <div className="px-4 py-2">
        <p className="text-ui-fg-muted text-xs">
          Usa este editor para la descripción. Para imágenes: sube la foto en "Media" → copia la URL → usa 🖼 Imagen.
        </p>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductDescriptionWidget
