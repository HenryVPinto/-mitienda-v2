"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import type { Brand } from "@/lib/types"

type Props = {
  brands: Brand[]
}

const CARD_W = 120
const GAP = 16
const AUTOPLAY_MS = 2800

export function BrandsSlider({ brands }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const [visibleCount, setVisibleCount] = useState(6)
  const [paused, setPaused] = useState(false)
  const total = brands.length
  const maxIndex = Math.max(0, total - visibleCount)

  useEffect(() => {
    function updateVisible() {
      const w = trackRef.current?.parentElement?.clientWidth ?? 800
      setVisibleCount(Math.max(1, Math.floor((w + GAP) / (CARD_W + GAP))))
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

  const offset = index * (CARD_W + GAP)

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${offset}px)`, gap: GAP }}
      >
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/marca/${brand.handle}`}
            className="flex-shrink-0 flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg hover:border-primary/40 hover:shadow-sm transition-all"
            style={{ width: CARD_W, height: 56 }}
            title={brand.name}
          >
            {brand.logo_url ? (
              <Image
                src={brand.logo_url}
                alt={brand.name}
                width={80}
                height={32}
                className="object-contain max-h-8 w-auto"
              />
            ) : (
              <span className="text-sm font-semibold text-gray-600 text-center leading-tight line-clamp-2">
                {brand.name}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
