import { useEffect, useRef } from "react"

function ToolbarBtn({
  cmd,
  arg,
  title,
  children,
  onAction,
}: {
  cmd?: string
  arg?: string
  title: string
  children: React.ReactNode
  onAction?: () => void
}) {
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    if (onAction) { onAction(); return }
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

type RichEditorProps = {
  initialHtml?: string
  onChange: (html: string) => void
  minHeight?: string
  placeholder?: string
}

export function RichEditor({
  initialHtml = "",
  onChange,
  minHeight = "160px",
  placeholder = "Escribe el contenido aquí...",
}: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = initialHtml
    }
  }, []) // solo al montar — el padre controla cambios de item via key

  const sync = () => onChange(ref.current?.innerHTML ?? "")

  const insertImage = () => {
    const url = window.prompt("URL de la imagen:")
    if (!url) return
    ref.current?.focus()
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${url}" style="max-width:100%;border-radius:8px;margin:8px 0;" />`
    )
    sync()
  }

  const insertLink = () => {
    const url = window.prompt("URL del enlace:")
    if (!url) return
    document.execCommand("createLink", false, url)
    sync()
  }

  return (
    <div className="border border-ui-border-base rounded-md overflow-hidden text-sm">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-1.5 bg-ui-bg-subtle border-b border-ui-border-base">
        <ToolbarBtn cmd="bold" title="Negrita"><strong>B</strong></ToolbarBtn>
        <ToolbarBtn cmd="italic" title="Cursiva"><em>I</em></ToolbarBtn>
        <ToolbarBtn cmd="underline" title="Subrayado"><u>U</u></ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn cmd="formatBlock" arg="h2" title="Título H2">H2</ToolbarBtn>
        <ToolbarBtn cmd="formatBlock" arg="h3" title="Subtítulo H3">H3</ToolbarBtn>
        <ToolbarBtn cmd="formatBlock" arg="p" title="Párrafo">¶</ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn cmd="insertUnorderedList" title="Lista con viñetas">• Lista</ToolbarBtn>
        <ToolbarBtn cmd="insertOrderedList" title="Lista numerada">1. Lista</ToolbarBtn>
        <span className="w-px bg-ui-border-base mx-1" />
        <ToolbarBtn title="Insertar enlace" onAction={insertLink}>🔗 Enlace</ToolbarBtn>
        <ToolbarBtn title="Insertar imagen" onAction={insertImage}>🖼 Imagen</ToolbarBtn>
      </div>

      {/* Área editable */}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={sync}
        data-placeholder={placeholder}
        className="px-3 py-2 text-ui-fg-base focus:outline-none"
        style={{ minHeight, lineHeight: "1.7" }}
      />

      <div className="px-3 py-1.5 border-t border-ui-border-base bg-ui-bg-subtle">
        <p className="text-ui-fg-muted text-xs">
          Para imágenes: sube el archivo en Media → copia la URL → usa 🖼 Imagen
        </p>
      </div>
    </div>
  )
}
