// Shared price chip. Every template must use this — locks in the brand
// treatment (bg-pop + text-pop-foreground) so templates can't diverge on
// the color and org brand-color overrides flow through the CSS vars.

interface PriceChipProps {
  symbol: string
  price: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE: Record<NonNullable<PriceChipProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-[13px]',
  lg: 'px-3 py-1.5 text-[15px]',
}

export function PriceChip({ symbol, price, size = 'md', className }: PriceChipProps) {
  if (price <= 0) return null
  return (
    <span
      className={`bg-pop text-pop-foreground shrink-0 rounded-full font-semibold tabular-nums ${SIZE[size]}${
        className ? ' ' + className : ''
      }`}
    >
      {symbol}
      {Number.isInteger(price) ? price : price.toFixed(2)}
    </span>
  )
}
