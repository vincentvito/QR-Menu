import { cn } from '@/lib/utils'

interface KickerProps {
  children: React.ReactNode
  // Color override. Defaults to muted text; "pop" uses persimmon, "accent" uses pistachio.
  tone?: 'default' | 'pop' | 'accent'
  className?: string
}

// Section label — persimmon dot + uppercase tracked text, 12px / 500 / 0.14em.
export function Kicker({ children, tone = 'default', className }: KickerProps) {
  const color =
    tone === 'pop' ? 'text-pop' : tone === 'accent' ? 'text-accent' : 'text-muted-foreground'
  const dot = tone === 'accent' ? 'bg-accent' : 'bg-pop'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[12px] leading-none font-medium tracking-[0.14em] uppercase',
        color,
        className,
      )}
    >
      <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', dot)} />
      {children}
    </span>
  )
}
