// Shared multi-price display: one pill per size, all visible inline.
// Same brand treatment as PriceChip (bg-pop + text-pop-foreground) so
// templates can't diverge on the color.

import type { MenuItemVariant } from '@/lib/menus/variants'
import { formatMenuPrice } from '@/lib/menus/price-format'

interface VariantPriceChipsProps {
  symbol: string
  variants: MenuItemVariant[]
  size?: 'sm' | 'md'
  className?: string
}

const SIZE: Record<NonNullable<VariantPriceChipsProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-[12px]',
}

export function VariantPriceChips({
  symbol,
  variants,
  size = 'md',
  className,
}: VariantPriceChipsProps) {
  if (variants.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5${className ? ' ' + className : ''}`}>
      {variants.map((variant) => (
        <span
          key={variant.label}
          className={`bg-pop text-pop-foreground shrink-0 rounded-full font-semibold tabular-nums ${SIZE[size]}`}
        >
          {variant.label} {symbol}
          {formatMenuPrice(symbol, variant.price)}
        </span>
      ))}
    </div>
  )
}
