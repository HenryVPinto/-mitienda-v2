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
  const action = basePath ?? (handle ? `/categoria/${handle}` : "/catalogo")

  return (
    <form method="GET" action={action}>
      <input type="hidden" name="page" value="1" />
      <select
        name="sort"
        defaultValue={current}
        onChange={(e) => e.currentTarget.form?.submit()}
        className="text-sm border border-gray-200 rounded-md px-2 py-1.5 focus:outline-none focus:border-primary bg-white"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  )
}
