// Decorative animated layer rendered over the public menu. Pure CSS —
// each particle is an absolutely-positioned <span> animated via keyframes
// defined in globals.css. No JS, no external assets, respects
// `prefers-reduced-motion` automatically.

import { memo } from 'react'

interface SeasonalOverlayProps {
  id: string
  // When 'contained', the overlay sits inside its parent (for the Settings
  // preview mockup). When 'viewport', it covers the full viewport (live menu).
  scope?: 'viewport' | 'contained'
}

const PARTICLE_COUNTS: Record<string, number> = {
  snow: 35,
  autumn: 22,
  confetti: 28,
}

// Memoized — primitive props (id, scope) + a lot of child nodes (35 particles)
// means a re-render with the same inputs is wasted work, especially inside
// TemplatePreview where the Settings form re-renders on every color-picker
// drag and theme change.
export const SeasonalOverlay = memo(function SeasonalOverlay({
  id,
  scope = 'viewport',
}: SeasonalOverlayProps) {
  if (id === 'none' || !(id in PARTICLE_COUNTS)) return null
  const count = PARTICLE_COUNTS[id]
  const position = scope === 'viewport' ? 'fixed' : 'absolute'
  return (
    <div
      aria-hidden="true"
      data-seasonal-overlay={id}
      className="pointer-events-none inset-0 z-[5] overflow-hidden motion-reduce:hidden"
      style={{ position, contain: 'layout paint' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Particle key={i} id={id} index={i} total={count} />
      ))}
    </div>
  )
})

function Particle({ id, index, total }: { id: string; index: number; total: number }) {
  // Deterministic pseudo-randoms so the layout is stable across renders.
  const leftPct = (index * 53) % 100
  const duration = 8 + ((index * 17) % 7) // 8–14s
  const delay = (index * 1.3) % 8 // 0–8s stagger

  if (id === 'snow') {
    const size = 3 + ((index * 7) % 5) // 3–7px
    return (
      <span
        className="absolute block rounded-full bg-white/80 shadow-[0_0_4px_rgba(255,255,255,0.4)]"
        style={{
          left: `${leftPct}%`,
          top: '-6%',
          width: `${size}px`,
          height: `${size}px`,
          animation: `seasonal-snow ${duration}s linear ${delay}s infinite`,
        }}
      />
    )
  }

  if (id === 'autumn') {
    const size = 8 + ((index * 11) % 6) // 8–13px
    const colors = ['#C98744', '#A3563D', '#D4A94A', '#8B5E2E']
    const color = colors[index % colors.length]
    return (
      <span
        className="absolute block"
        style={{
          left: `${leftPct}%`,
          top: '-8%',
          width: `${size}px`,
          height: `${size + 3}px`,
          backgroundColor: color,
          borderRadius: '60% 20% 60% 20%',
          animation: `seasonal-autumn ${duration + 3}s linear ${delay}s infinite`,
        }}
      />
    )
  }

  if (id === 'confetti') {
    const useAccent = index % 2 === 0
    const height = 10 + ((index * 5) % 6) // 10–15px
    const colorClass = useAccent ? 'bg-accent' : 'bg-pop'
    return (
      <span
        className={`absolute block ${colorClass}`}
        style={{
          left: `${leftPct}%`,
          top: '-6%',
          width: '7px',
          height: `${height}px`,
          animation: `seasonal-confetti ${duration - 1}s linear ${delay}s infinite`,
        }}
      />
    )
  }

  // Fallback — shouldn't reach here given the guard above.
  // Use `total` to keep the eslint signal; also means exhaustive consumers
  // can ignore this.
  void total
  return null
}
