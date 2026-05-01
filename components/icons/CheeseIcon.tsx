import { forwardRef } from 'react'
import type { LucideProps } from 'lucide-react'

export const CheeseIcon = forwardRef<SVGSVGElement, LucideProps>(function CheeseIcon(
  { color = 'currentColor', size = 24, strokeWidth = 2, absoluteStrokeWidth, ...props },
  ref,
) {
  const width = typeof size === 'number' ? size : undefined
  const stroke =
    absoluteStrokeWidth && typeof size === 'number'
      ? (Number(strokeWidth) * 24) / size
      : strokeWidth

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={width ?? size}
      height={width ?? size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M3.5 18.5h17V9.75L11.5 5 3.5 18.5Z" />
      <path d="M11.5 5v13.5" />
      <circle cx="9" cy="15.25" r="1" />
      <circle cx="14.5" cy="11.75" r="1.25" />
    </svg>
  )
})
