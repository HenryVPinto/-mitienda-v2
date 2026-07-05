"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProductCard } from "@/components/product/product-card"
import type { Product } from "@/lib/types"

type Props = {
  products: Product[]
}

const CARD_WIDTH = 220
const GAP = 16
const AUTOPLAY_MS = 3500

export function FeaturedSlider({ products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(4)
  const [paused, setPaused] = useState(false)
  const total = products.length
  const maxIndex = Math.max(0, total - visibleCount)

  useEffect(() => {
    function updateVisible() {
      const w = trackRef.current?.parentElement?.clientWidth ?? 800
      setVisibleCount(Math.max(1, Math.floor((w + GAP) / (CARD_WIDTH + GAP))))
    }
    updateVisible()
    window.addEventListener("resize", updateVisible)
    return () => window.removeEventListener("resize", updateVisible)
  }, [])

  useEffect(() => {
    if (paused || total <= visibleCount) return
    const id = setInterval(() => {
      setIndex((i) => (i >= maxIndex ? 0 : i + 1))
    }, AUTOPLAY_MS)
    return () => clearInterval(id)
  }, [paused, total, visibleCount, maxIndex])

  const step = (dir: 1 | -1) => {
    setIndex((i) => Math.min(maxIndex, Math.max(0, i + dir)))
  }

  const offset = index * (CARD_WIDTH + GAP)

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          ref={trackRef}
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${offset}px)`, gap: GAP }}
        >
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0" style={{ width: CARD_WIDTH }}>
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>

      {total > visibleCount && (
        <>
          <button
            onClick={() => step(-1)}
            disabled={index === 0}
            aria-label="Anterior"
            className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => step(1)}
            disabled={index >= maxIndex}
            aria-label="Siguiente"
            className="absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-600 hover:text-primary hover:border-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex justify-center gap-1.5 mt-4">
            {Array.from({ length: maxIndex + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Ir a posición ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-gray-300"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
