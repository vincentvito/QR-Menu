// Theme = palette + typography preset applied to a restaurant's public
// menu. Orthogonal to template (layout) and seasonal overlay (animation).
// Each theme overrides the semantic CSS vars templates already read from,
// so adding a theme doesn't require touching any template code.

export interface ThemeDef {
  id: string
  label: string
  description: string
  // Full font-family CSS value for the theme's headings. Body font stays
  // DM Sans across themes for readable dish copy at small sizes.
  headingFontFamily: string
  // Subset of the root CSS vars. Any var omitted falls through to the
  // default theme's value from globals.css.
  colors: {
    background: string
    foreground: string
    card: string
    accent: string
    accentForeground: string
    accentDeep: string
    pop: string
    popForeground: string
    popDeep: string
    muted: string
    mutedForeground: string
    border: string
    chip: string
    chipForeground: string
  }
}

// Loaded font stacks. Fraunces + Unbounded are requested in layout.tsx.
const FONT_SANS = "'DM Sans', ui-sans-serif, system-ui, sans-serif"
const FONT_SERIF = "'Instrument Serif', 'DM Sans', Georgia, serif"
const FONT_FRAUNCES = "'Fraunces', Georgia, serif"
const FONT_UNBOUNDED =
  "'Unbounded', ui-sans-serif, system-ui, sans-serif"

export const THEMES: ThemeDef[] = [
  {
    id: 'editorial',
    label: 'Editorial',
    description: 'Warm cream + persimmon prices. The original look.',
    headingFontFamily: FONT_SANS,
    colors: {
      background: '#F6F2E7',
      foreground: '#1A1E17',
      card: '#EFE8D4',
      accent: '#C8E06A',
      accentForeground: '#1A1E17',
      accentDeep: '#9DB84A',
      pop: '#E8552B',
      popForeground: '#FFFFFF',
      popDeep: '#C43E18',
      muted: '#EFE8D4',
      mutedForeground: '#6B6B5E',
      border: '#D9CFB4',
      chip: '#FFD36B',
      chipForeground: '#1A1E17',
    },
  },
  {
    id: 'pastel',
    label: 'Pastel',
    description: 'Sage + coral on warm off-white, with elegant serif headings.',
    headingFontFamily: FONT_SERIF,
    colors: {
      background: '#FAF5F2',
      foreground: '#3F3A3D',
      card: '#F4ECE6',
      accent: '#A5C99D',
      accentForeground: '#2E3A2F',
      accentDeep: '#7FA876',
      // Punchier coral — reads as a clear price chip rather than a soft
      // watercolor blob.
      pop: '#CC6B68',
      popForeground: '#FFFFFF',
      popDeep: '#A84F4C',
      muted: '#F4ECE6',
      mutedForeground: '#7A7376',
      border: '#E5DDD6',
      chip: '#F5D9B8',
      chipForeground: '#3F3A3D',
    },
  },
  {
    id: 'luxury',
    label: 'Luxury',
    description: 'Warm parchment with espresso text and gold price chips. Fraunces serif headings.',
    headingFontFamily: FONT_FRAUNCES,
    colors: {
      // Deeper warm parchment — clearly richer than Editorial's cream so
      // the two themes read as genuinely different at a glance, not just
      // a font swap.
      background: '#EDE2C6',
      foreground: '#24180E',
      card: '#DFD0AE',
      // Burgundy as the quiet accent — classic gold-and-wine pairing,
      // much warmer next to the espresso text and gold price pill than a
      // forest green that fought both of them.
      accent: '#6B2025',
      accentForeground: '#F4E9CD',
      accentDeep: '#4A1319',
      // Classic web gold for price chips — pure, saturated, unambiguously
      // "gold" rather than olive. The espresso text pops against it.
      pop: '#D4AF37',
      popForeground: '#24180E',
      popDeep: '#A8862C',
      muted: '#DFD0AE',
      mutedForeground: '#6B5E47',
      border: '#B59D73',
      chip: '#D4AF37',
      chipForeground: '#24180E',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    description: 'Amber + burgundy on deep ink, set in Unbounded display.',
    headingFontFamily: FONT_UNBOUNDED,
    colors: {
      background: '#13141A',
      foreground: '#F2EDE0',
      card: '#1C1D26',
      accent: '#D4A44C',
      accentForeground: '#13141A',
      accentDeep: '#A47C2F',
      pop: '#A3445C',
      popForeground: '#F2EDE0',
      popDeep: '#7E2E43',
      muted: '#1C1D26',
      mutedForeground: '#A8A39C',
      border: '#2B2D3A',
      chip: '#E2B261',
      chipForeground: '#13141A',
    },
  },
  {
    id: 'sunset',
    label: 'Sunset',
    description: 'Mediterranean mix — terracotta prices against ocean blue.',
    headingFontFamily: FONT_SANS,
    colors: {
      background: '#FAF3EA',
      foreground: '#2A2622',
      card: '#F2E8DA',
      // Ocean accent gives the theme its Mediterranean tension against
      // the terracotta pop — not another orange-on-orange palette.
      accent: '#4A92A6',
      accentForeground: '#FFFFFF',
      accentDeep: '#34707F',
      pop: '#D2573A',
      popForeground: '#FFFFFF',
      popDeep: '#AA3F25',
      muted: '#F2E8DA',
      mutedForeground: '#7E6F5E',
      border: '#E8DCC9',
      chip: '#F3C99A',
      chipForeground: '#2A2622',
    },
  },
]

export const DEFAULT_THEME_ID = 'editorial'

export function getTheme(id: string | null | undefined): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function isThemeId(value: unknown): value is string {
  return typeof value === 'string' && THEMES.some((t) => t.id === value)
}
