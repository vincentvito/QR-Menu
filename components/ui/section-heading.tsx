import type { ComponentProps, ElementType } from 'react'
import { cn } from '@/lib/utils'

// Dashboard section heading. Sized up from the old uppercase eyebrow so
// sections dominate the shadcn Labels beneath them, while staying in the
// sans-serif brand body (DM Sans). Kept as a sibling of shadcn's managed
// ui/* files so it survives `shadcn add` without manual merging.
export function SectionHeading({
  className,
  as,
  ...props
}: ComponentProps<'h2'> & { as?: ElementType }) {
  const Tag = as ?? 'h2'
  return (
    <Tag
      className={cn('text-foreground text-[17px] font-semibold tracking-[-0.01em]', className)}
      {...props}
    />
  )
}
