// Seasonal overlay = optional decorative animation layer on top of the
// public menu. Orthogonal to theme and template — any combination works.

export interface SeasonalOverlayDef {
  id: string
  label: string
  description: string
}

export const SEASONAL_OVERLAYS: SeasonalOverlayDef[] = [
  {
    id: 'none',
    label: 'None',
    description: 'No seasonal animation.',
  },
  {
    id: 'snow',
    label: 'Snow',
    description: 'Soft white flakes drifting down. Winter / holidays.',
  },
  {
    id: 'autumn',
    label: 'Autumn',
    description: 'Amber and copper leaves falling. Fall season.',
  },
  {
    id: 'confetti',
    label: 'Confetti',
    description: 'Celebration confetti in your brand colors. Year-round festive.',
  },
]

export const DEFAULT_SEASONAL_OVERLAY_ID = 'none'

export function isSeasonalOverlayId(value: unknown): value is string {
  return typeof value === 'string' && SEASONAL_OVERLAYS.some((o) => o.id === value)
}
