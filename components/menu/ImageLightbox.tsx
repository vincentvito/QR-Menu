'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxProps {
  src: string | null
  onClose: () => void
}

// Full-screen image viewer. Opens when `src` is a string; closes on backdrop
// click, close button, or Escape. Locks body scroll while open.
export function ImageLightbox({ src, onClose }: ImageLightboxProps) {
  // Parents usually pass an inline onClose; stashing it in a ref keeps the
  // effect's dep list down to `src` so the body-scroll lock and keydown
  // listener don't teardown+setup on every parent re-render (e.g. while the
  // user is typing in the search field).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!src) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [src])

  if (!src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dish photo"
      onClick={onClose}
      className="bg-foreground/85 fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
      />
      <button
        type="button"
        onClick={onClose}
        className="bg-background text-foreground hover:bg-background/90 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold shadow-lg transition-colors"
      >
        <X className="size-4" aria-hidden="true" />
        Close
      </button>
    </div>
  )
}
