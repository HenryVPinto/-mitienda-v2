import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading } from "@medusajs/ui"

const LABELS: Record<string, { label: string; icon: string }> = {
  bank_transfer: { label: "Depósito / Transferencia", icon: "🏦" },
  visalink:      { label: "NeoLink / Link de pago",   icon: "💳" },
  cash:          { label: "Contra entrega",            icon: "💵" },
}

type Props = {
  data: { metadata?: Record<string, unknown> | null }
}

const OrderPaymentMethodWidget = ({ data: order }: Props) => {
  const method = (order.metadata?.payment_method as string | undefined) ?? "cash"
  const { label, icon } = LABELS[method] ?? LABELS.cash

  return (
    <Container className="p-0 divide-y">
      <div className="px-4 py-3">
        <Heading level="h3" className="text-sm font-medium mb-2">
          Método de pago
        </Heading>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-ui-fg-base">{label}</span>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.side.before",
})

export default OrderPaymentMethodWidget
