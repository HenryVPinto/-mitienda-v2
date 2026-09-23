export default function SearchLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Heading skeleton */}
      <div className="h-7 w-56 bg-gray-200 rounded-md animate-pulse mb-5" />

      {/* Product card skeletons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <div className="aspect-square bg-gray-200 animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/3" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-2/5 mt-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
