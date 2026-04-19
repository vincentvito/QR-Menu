import { ChefHat, Crown, Flame, Sparkles, Star, type LucideIcon } from 'lucide-react'

// Stable badge keys. Templates and analytics read these, so they must not
// change once shipped. Labels/icons/colors are presentation and can evolve.
export const BADGE_KEYS = ['best-seller', 'chefs-pick', 'signature', 'new', 'spicy'] as const
export type BadgeKey = (typeof BADGE_KEYS)[number]

export interface BadgeDef {
  key: BadgeKey
  label: string
  icon: LucideIcon
  // Filled pill (used on the public menu).
  pillClassName: string
  // Selected chip in the editor picker — same palette as the pill.
  selectedChipClassName: string
}

// Definitions are keyed off the brand palette so templates that re-skin
// the public menu can still rely on the semantic tokens. Swap a template
// and the badges come along without per-badge overrides.
export const BADGES: Record<BadgeKey, BadgeDef> = {
  'best-seller': {
    key: 'best-seller',
    label: 'Best Seller',
    icon: Star,
    pillClassName: 'bg-pop text-pop-foreground',
    selectedChipClassName: 'border-pop bg-pop text-pop-foreground',
  },
  'chefs-pick': {
    key: 'chefs-pick',
    label: "Chef's Pick",
    icon: ChefHat,
    pillClassName: 'bg-foreground text-background',
    selectedChipClassName: 'border-foreground bg-foreground text-background',
  },
  signature: {
    key: 'signature',
    label: 'Signature',
    icon: Crown,
    pillClassName: 'bg-chip text-chip-foreground',
    selectedChipClassName: 'border-chip bg-chip text-chip-foreground',
  },
  new: {
    key: 'new',
    label: 'New',
    icon: Sparkles,
    pillClassName: 'bg-accent text-accent-foreground',
    selectedChipClassName: 'border-accent-deep bg-accent text-accent-foreground',
  },
  spicy: {
    key: 'spicy',
    label: 'Spicy',
    icon: Flame,
    pillClassName: 'bg-[#E8552B] text-white',
    selectedChipClassName: 'border-[#C43E18] bg-[#E8552B] text-white',
  },
}

export function isBadgeKey(value: unknown): value is BadgeKey {
  return typeof value === 'string' && (BADGE_KEYS as readonly string[]).includes(value)
}

export function getBadge(key: string): BadgeDef | null {
  return isBadgeKey(key) ? BADGES[key] : null
}

// Given an org's disabled list and a dish's badge assignments, return the
// badges to actually render — preserves the canonical BADGE_KEYS order so
// "Best Seller" always precedes "Spicy" regardless of assignment order.
export function visibleBadges(
  assigned: string[],
  disabled: string[] | null | undefined,
): BadgeDef[] {
  const disabledSet = new Set(disabled ?? [])
  const assignedSet = new Set(assigned)
  return BADGE_KEYS.filter((k) => assignedSet.has(k) && !disabledSet.has(k)).map(
    (k) => BADGES[k],
  )
}
