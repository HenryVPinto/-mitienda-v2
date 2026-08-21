"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { ZoomIn, ChevronLeft, ChevronRight } from "lucide-react"

type ImageItem = { id: string; url: string }

export function ProductGallery({ images, title }: { images: ImageItem[]; title: string }) {
  const [selected, setSelected] = useState(0)
  const [zooming, setZooming] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)

  const total = images.length

  const goTo = useCallback((index: number) => {
    setSelected(((index % total) + total) % total)
  }, [total])

  const prev = useCallback(() => goTo(selected - 1), [goTo, selected])
  const next = useCallback(() => goTo(selected + 1), [goTo, selected])

  // Auto-rotación cada 3 segundos, se pausa al hacer hover (zoom)
  const startInterval = useCallback(() => {
    if (total <= 1) return
    intervalRef.current = setInterval(() => {
      setSelected((s) => ((s + 1) % total))
    }, 3000)
  }, [total])

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    startInterval()
    return stopInterval
  }, [startInterval, stopInterval])

  // Reiniciar el timer cuando el usuario navega manualmente
  function handleNav(fn: () => void) {
    stopInterval()
    fn()
    startInterval()
  }

  function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 50) return
    handleNav(delta < 0 ? next : prev)
  }

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
      {/* Imagen principal */}
      <div className="relative">
        <div
          className="relative aspect-square bg-gray-50 rounded-xl overflow-hidden select-none cursor-zoom-in"
          onMouseEnter={() => { setZooming(true); stopInterval() }}
          onMouseLeave={() => { setZooming(false); startInterval() }}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Wrapper zoom */}
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

          {/* Hint zoom */}
          {!zooming && (
            <div className="absolute bottom-3 right-3 bg-black/30 text-white rounded-full p-1.5 pointer-events-none">
              <ZoomIn className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Flechas de navegación — solo si hay más de 1 imagen */}
        {total > 1 && (
          <>
            <button
              onClick={() => handleNav(prev)}
              aria-label="Imagen anterior"
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10
                         bg-white border border-gray-200 shadow-md rounded-full w-10 h-10
                         flex items-center justify-center
                         hover:bg-primary hover:text-white hover:border-primary
                         transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleNav(next)}
              aria-label="Imagen siguiente"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10
                         bg-white border border-gray-200 shadow-md rounded-full w-10 h-10
                         flex items-center justify-center
                         hover:bg-primary hover:text-white hover:border-primary
                         transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Miniaturas */}
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => handleNav(() => goTo(i))}
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
