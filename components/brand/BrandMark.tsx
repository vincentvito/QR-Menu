import { cn } from '@/lib/utils'
import { QRDots } from './QRDots'

type BrandMarkSize = 'sm' | 'md' | 'lg'

interface BrandMarkProps {
  size?: BrandMarkSize
  iconOnly?: boolean
  // Inverted treatment for placement on dark/ink backgrounds.
  invert?: boolean
  className?: string
}

const sizeStyles: Record<BrandMarkSize, { box: string; dots: number; text: string; gap: string }> =
  {
    sm: { box: 'h-7 w-7 rounded-md', dots: 16, text: 'text-sm', gap: 'gap-2' },
    md: { box: 'h-9 w-9 rounded-[0.625rem]', dots: 20, text: 'text-[17px]', gap: 'gap-2.5' },
    lg: { box: 'h-11 w-11 rounded-xl', dots: 26, text: 'text-xl', gap: 'gap-3' },
  }

export function BrandMark({
  size = 'md',
  iconOnly = false,
  invert = false,
  className,
}: BrandMarkProps) {
  const s = sizeStyles[size]
  const fill = invert ? 'bg-background text-accent' : 'bg-foreground text-accent'

  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <span className={cn('inline-flex items-center justify-center', s.box, fill)}>
        <QRDots size={s.dots} seed={7} />
      </span>
      {!iconOnly && (
        <span className={cn('font-semibold tracking-[-0.02em]', s.text)}>Qtable</span>
      )}
    </span>
  )
}
