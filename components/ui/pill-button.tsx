import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

// Design-spec pill buttons. Kept in a separate file from the shadcn-managed
// button.tsx so that re-running `npx shadcn add button` (which overwrites
// that file) doesn't blow away our custom variants.
//
// Use these via `<PillButton variant="primary">…</PillButton>` instead of
// `<Button variant="pillPrimary">` so the dependency stays explicit.
const pillButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          'btn-pill-shadow-primary bg-foreground text-background hover:bg-foreground',
        accent: 'btn-pill-shadow-accent bg-accent text-accent-foreground hover:bg-accent',
        ghost:
          'border-[1.5px] border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background',
      },
      // `sm` mirrors shadcn Button sm exactly so pill + outline buttons
      // line up cleanly when rendered side-by-side. `default`/`lg` keep
      // the design-spec pill sizing used on the marketing pages.
      size: {
        sm: 'h-8 gap-1.5 px-3 text-sm has-[>svg]:px-2.5',
        default:
          'h-11 gap-2 px-6 text-[15px] leading-none tracking-[-0.005em] has-[>svg]:px-5',
        lg: 'h-12 gap-2 px-7 text-[15px] leading-none tracking-[-0.005em] has-[>svg]:px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

function PillButton({
  className,
  variant = 'primary',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof pillButtonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="pill-button"
      data-variant={variant}
      data-size={size}
      className={cn(pillButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { PillButton, pillButtonVariants }
