import { visibleBadges } from '@/lib/menus/badges'

interface BadgeRowProps {
  badges: string[]
}

// Renders editorial badges as filled pills. Order is driven by the canonical
// BADGE_KEYS ordering inside visibleBadges(), not by the dish's array order
// so the same two badges render identically across every dish.
export function BadgeRow({ badges }: BadgeRowProps) {
  const list = visibleBadges(badges)
  if (list.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {list.map((def) => {
        const Icon = def.icon
        return (
          <span
            key={def.key}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${def.pillClassName}`}
          >
            <Icon className="size-3" aria-hidden="true" />
            {def.label}
          </span>
        )
      })}
    </div>
  )
}
