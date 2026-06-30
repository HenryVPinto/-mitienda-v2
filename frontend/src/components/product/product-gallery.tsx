"use client"

import { useState } from "react"
import Image from "next/image"
import { ZoomIn } from "lucide-react"

type ImageItem = { id: string; url: string }

export function ProductGallery({ images, title }: { images: ImageItem[]; title: string }) {
  const [selected, setSelected] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin({ x, y })
  }

  if (!images.length) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
        Sin imagen
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Imagen principal con zoom */}
      <div
        className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden select-none cursor-zoom-in"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Wrapper del zoom — el transform va aquí, no en el Image */}
        <div
          className="absolute inset-0"
          style={{
            transition: zooming ? "none" : "transform 0.15s ease-out",
            transform: zooming ? `scale(2.4)` : "scale(1)",
            transformOrigin: `${origin.x}% ${origin.y}%`,
          }}
        >
          <Image
            src={images[selected].url}
            alt={title}
            fill
            className="object-contain p-4"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>
        {/* Hint de zoom */}
        {!zooming && (
          <div className="absolute bottom-3 right-3 bg-black/30 text-white rounded-full p-1.5 pointer-events-none">
            <ZoomIn className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Miniaturas */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selected === i
                  ? "border-primary shadow-sm"
                  : "border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100"
              }`}
            >
              <Image
                src={img.url}
                alt={`${title} ${i + 1}`}
                fill
                className="object-contain p-1"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
