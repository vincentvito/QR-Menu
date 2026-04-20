import { getTheme, type ThemeDef } from '@/lib/menus/themes'

interface ThemeStylesProps {
  themeId: string
  // Overrides the theme's accent/pop with the restaurant's brand colors.
  // Applied per-dish when the restaurant has set custom brand colors.
  accentOverride?: string | null
  popOverride?: string | null
}

// Renders the CSS variables for the selected theme plus a scoped rule that
// applies the theme's heading font to h1-h4. Wraps its children in a
// `data-theme` node so the selector is specific enough to beat Tailwind
// defaults without `!important`.
export function ThemeStyles({
  themeId,
  accentOverride,
  popOverride,
  children,
}: ThemeStylesProps & { children: React.ReactNode }) {
  const theme = getTheme(themeId)
  const style = buildInlineStyle(theme, accentOverride, popOverride)
  return (
    <div data-theme={theme.id} style={style as React.CSSProperties}>
      {children}
    </div>
  )
}

// Builds the inline style object. Kept as a helper so SettingsForm can use
// the same logic when wrapping the preview.
export function buildInlineStyle(
  theme: ThemeDef,
  accentOverride?: string | null,
  popOverride?: string | null,
): Record<string, string> {
  const c = theme.colors
  return {
    '--background': c.background,
    '--foreground': c.foreground,
    '--card': c.card,
    '--card-foreground': c.foreground,
    '--popover': c.background,
    '--popover-foreground': c.foreground,
    '--primary': c.foreground,
    '--primary-foreground': c.background,
    '--secondary': c.card,
    '--secondary-foreground': c.foreground,
    '--accent': accentOverride || c.accent,
    '--accent-foreground': c.accentForeground,
    '--accent-deep': c.accentDeep,
    '--pop': popOverride || c.pop,
    '--pop-foreground': c.popForeground,
    '--pop-deep': c.popDeep,
    '--muted': c.muted,
    '--muted-foreground': c.mutedForeground,
    '--border': c.border,
    '--input': c.border,
    '--ring': c.foreground,
    '--cream-line': c.border,
    '--chip': c.chip,
    '--chip-foreground': c.chipForeground,
    '--theme-heading-font': theme.headingFontFamily,
  }
}
