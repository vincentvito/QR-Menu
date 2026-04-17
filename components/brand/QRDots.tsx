interface QRDotsProps {
  size?: number
  seed?: number
  density?: number
  className?: string
}

// Decorative seeded-random QR-like dot grid used inside the brand mark.
// Deterministic so every render is identical for a given seed.
export function QRDots({ size = 20, seed = 7, density = 0.55, className }: QRDotsProps) {
  const n = 9
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const cells: Array<[number, number]> = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (rand() < density) cells.push([x, y])
    }
  }
  const corners: Array<[number, number]> = [
    [0, 0],
    [n - 3, 0],
    [0, n - 3],
  ]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {cells.map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="1" height="1" rx="0.2" fill="currentColor" />
      ))}
      {corners.map(([cx, cy], i) => (
        <g key={i}>
          <rect
            x={cx}
            y={cy}
            width="3"
            height="3"
            rx="0.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.4"
          />
          <rect x={cx + 1} y={cy + 1} width="1" height="1" rx="0.2" fill="currentColor" />
        </g>
      ))}
    </svg>
  )
}
