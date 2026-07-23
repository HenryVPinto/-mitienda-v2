import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, toast } from "@medusajs/ui"
import { Copy } from "lucide-react"

type ShippingAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  city?: string | null
  province?: string | null
  phone?: string | null
  metadata?: Record<string, unknown> | null
}

type Order = {
  id: string
  email?: string | null
  metadata?: Record<string, unknown> | null
  shipping_address?: ShippingAddress | null
}

type Props = {
  data: Order
}

function row(label: string, value: string | null | undefined) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm py-1 border-b border-ui-border-base last:border-0">
      <span className="text-ui-fg-subtle min-w-[110px]">{label}</span>
      <span className="font-medium text-ui-fg-base text-right break-all">{value}</span>
    </div>
  )
}

const OrderShippingInfoWidget = ({ data: order }: Props) => {
  const addr = order.shipping_address
  const meta = (order.metadata ?? {}) as Record<string, string | null>
  const addrMeta = (addr?.metadata ?? {}) as Record<string, string | null>

  const nombre = [addr?.first_name, addr?.last_name].filter(Boolean).join(" ")
  const tel1 = addr?.phone
  const tel2 = meta.telefono_2
  const nit = meta.nit ?? addrMeta.nit
  const referencia = meta.referencia ?? addrMeta.referencia
  const departamento = addr?.province
  const municipio = addr?.city
  const direccion = addr?.address_1
  const colonia = addr?.address_2 ?? addrMeta.aldea
  const email = order.email

  const buildCopyText = () => {
    const lines: string[] = []
    if (nombre)       lines.push(`Nombre: ${nombre}`)
    if (email)        lines.push(`Email: ${email}`)
    if (tel1)         lines.push(`Tel 1: ${tel1}`)
    if (tel2)         lines.push(`Tel 2: ${tel2}`)
    if (nit)          lines.push(`NIT/DPI: ${nit}`)
    if (departamento) lines.push(`Departamento: ${departamento}`)
    if (municipio)    lines.push(`Municipio: ${municipio}`)
    if (direccion)    lines.push(`Dirección: ${direccion}`)
    if (colonia)      lines.push(`Colonia/Barrio: ${colonia}`)
    if (referencia)   lines.push(`Referencia: ${referencia}`)
    return lines.join("\n")
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText())
      toast.success("Datos copiados al portapapeles")
    } catch {
      toast.error("No se pudo copiar")
    }
  }

  return (
    <Container className="p-0 divide-y">
      <div className="flex items-center justify-between px-4 py-3">
        <Heading level="h3" className="text-sm font-medium">
          Datos del destinatario
        </Heading>
        <button
          onClick={handleCopy}
          title="Copiar todos los datos"
          className="flex items-center gap-1.5 text-xs text-ui-fg-subtle hover:text-ui-fg-base transition-colors px-2 py-1 rounded hover:bg-ui-bg-subtle"
        >
          <Copy className="w-3.5 h-3.5" />
          Copiar todo
        </button>
      </div>

      <div className="px-4 py-3 space-y-0.5">
        {row("Nombre", nombre)}
        {row("Email", email)}
        {row("Tel 1", tel1)}
        {row("Tel 2", tel2)}
        {row("NIT / DPI", nit)}
        {row("Departamento", departamento)}
        {row("Municipio", municipio)}
        {row("Dirección", direccion)}
        {row("Colonia / Barrio", colonia)}
        {row("Referencia", referencia)}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderShippingInfoWidget
