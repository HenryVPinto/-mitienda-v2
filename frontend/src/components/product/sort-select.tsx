"use client"

type Props = {
  current: string
  handle?: string
  basePath?: string
}

const OPTIONS = [
  { value: "relevance", label: "Tendencia" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
]

export function SortSelect({ current, handle, basePath }: Props) {
  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const path = basePath ?? (handle ? `/categoria/${handle}` : "/catalogo")
    window.location.href = `${path}?sort=${e.target.value}&page=1`
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
