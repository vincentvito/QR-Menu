interface QRCodeProps {
  size?: number
  color?: string
  bg?: string
  className?: string
}

// Decorative 25x25 QR-like code for marketing/illustrative use only.
// Not a real QR — deterministic seeded cells plus three finder squares.
export function QRCode({ size = 180, color, bg = 'transparent', className }: QRCodeProps) {
  const n = 25
  let s = 42
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const fill = color ?? 'currentColor'
  const inner = bg === 'transparent' ? 'var(--background)' : bg

  const cells: Array<[number, number]> = []
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inCorner = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
      if (!inCorner && rand() < 0.48) cells.push([x, y])
    }
  }

  const finder = (cx: number, cy: number, key: string) => (
    <g key={key}>
      <rect x={cx} y={cy} width="7" height="7" rx="1.6" fill={fill} />
      <rect x={cx + 1} y={cy + 1} width="5" height="5" rx="1" fill={inner} />
      <rect x={cx + 2} y={cy + 2} width="3" height="3" rx="0.6" fill={fill} />
    </g>
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${n} ${n}`}
      className={className}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {bg !== 'transparent' && <rect width={n} height={n} rx="1" fill={bg} />}
      {cells.map(([x, y], i) => (
        <circle key={i} cx={x + 0.5} cy={y + 0.5} r="0.42" fill={fill} />
      ))}
      {finder(0, 0, 'tl')}
      {finder(n - 7, 0, 'tr')}
      {finder(0, n - 7, 'bl')}
    </svg>
  )
}
