"use client"

import { useRouter } from "next/navigation"

type Props = {
  current: string
  /** Para categoría: handle de la categoría. Para catálogo general: omitir. */
  handle?: string
  /** Ruta base completa. Si se pasa, tiene precedencia sobre handle. */
  basePath?: string
}

const OPTIONS = [
  { value: "relevance", label: "Tendencia" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
]

export function SortSelect({ current, handle, basePath }: Props) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const url = new URL(window.location.href)
    url.searchParams.set("sort", e.target.value)
    url.searchParams.set("page", "1")
    const path = basePath ?? (handle ? `/categoria/${handle}` : "/catalogo")
    router.push(`${path}?${url.searchParams.toString()}`)
  }

  return (
    <select
      defaultValue={current}
      onChange={handleChange}
      className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-primary bg-white"
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
