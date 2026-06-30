"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Banner } from "@/lib/types"

type Props = { banners: Banner[] }

export function BannerSlider({ banners }: Props) {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setCurrent((c) => (c + 1) % banners.length), 5000)
    return () => clearInterval(t)
  }, [banners.length])

  if (!banners.length) return null

  const banner = banners[current]

  return (
    <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-gray-100">
      <Link href={banner.link_url ?? "#"}>
        <Image
          src={banner.image_url}
          alt={banner.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 flex flex-col justify-center px-12">
          <h2 className="text-2xl sm:text-4xl font-bold text-white drop-shadow-lg max-w-md leading-tight">
            {banner.title}
          </h2>
          {banner.subtitle && (
            <p className="text-white/90 text-sm sm:text-base mt-2 drop-shadow">{banner.subtitle}</p>
          )}
        </div>
      </Link>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => setCurrent((c) => (c - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={() => setCurrent((c) => (c + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-1 shadow"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
