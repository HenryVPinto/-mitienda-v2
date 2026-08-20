type Props = {
  current: string
  handle?: string
  basePath?: string
}

const OPTIONS = [
  { value: "relevance", label: "Tendencia" },
  { value: "price_asc", label: "Menor precio" },
  { value: "price_desc", label: "Mayor precio" },
]

export function SortSelect({ current, handle, basePath }: Props) {
  const path = basePath ?? (handle ? `/categoria/${handle}` : "/catalogo")

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {OPTIONS.map((o) => (
        <a
          key={o.value}
          href={`${path}?sort=${o.value}&page=1`}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap ${
            current === o.value
              ? "bg-primary text-white border-primary"
              : "border-gray-200 text-gray-600 hover:border-primary hover:text-primary"
          }`}
        >
          {o.label}
        </a>
      ))}
    </div>
  )
}
