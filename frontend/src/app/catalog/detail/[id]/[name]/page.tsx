import { redirect } from "next/navigation"
import { storeGet } from "@/lib/medusa"
import type { Product } from "@/lib/types"

type Props = {
  params: Promise<{ id: string; name: string }>
}

export default async function OldCatalogRedirect({ params }: Props) {
  const { name } = await params
  const handle = name.toLowerCase().replace(/_/g, "-")

  try {
    const data = await storeGet<{ products: Product[] }>("/store/products", { handle })
    const product = data.products?.[0]
    if (product?.handle) {
      redirect(`/producto/${product.handle}`)
    }
  } catch {
    // producto no encontrado, ir al inicio
  }

  redirect("/")
}
