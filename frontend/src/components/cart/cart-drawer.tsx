"use client"

import Link from "next/link"
import Image from "next/image"
import { X, Minus, Plus, ShoppingCart } from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useCart } from "@/context/cart-context"
import { formatGTQ } from "@/lib/format"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onClose: () => void
}

export function CartDrawer({ open, onClose }: Props) {
  const { items, total, count, updateItem, removeItem, loading } = useCart()

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Carrito ({count})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 px-4">
            <ShoppingCart className="w-16 h-16 opacity-20" />
            <p className="text-sm">Tu carrito está vacío</p>
            <Button variant="outline" size="sm" onClick={onClose}>
              Seguir comprando
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 border-b last:border-0">
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {(() => {
                      const url = item.thumbnail ?? item.variant?.product?.thumbnail ?? item.variant?.product?.images?.[0]?.url ?? null
                      return url ? (
                        <Image
                          src={url}
                          alt={item.title}
                          width={64}
                          height={64}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200" />
                      )
                    })()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    {item.variant?.title && item.variant.title !== "Default Title" && (
                      <p className="text-xs text-gray-500">{item.variant.title}</p>
                    )}
                    <p className="text-sm font-bold text-[var(--color-brand-orange)] mt-1">
                      {formatGTQ(item.unit_price)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        disabled={loading || item.quantity <= 1}
                        onClick={() => updateItem(item.id, item.quantity - 1)}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm w-5 text-center">{item.quantity}</span>
                      <button
                        disabled={loading}
                        onClick={() => updateItem(item.id, item.quantity + 1)}
                        className="w-6 h-6 rounded border flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={loading}
                        className="ml-auto text-gray-400 hover:text-red-500 disabled:opacity-40"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t px-4 py-4 space-y-3">
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-[var(--color-brand-orange)]">{formatGTQ(total)}</span>
              </div>
              <Link
                href="/carrito"
                onClick={onClose}
                className={cn(buttonVariants({ variant: "default" }), "w-full bg-primary hover:bg-primary/90")}
              >
                Ver carrito completo
              </Link>
              <Link
                href="/checkout"
                onClick={onClose}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                Ir al Checkout
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
