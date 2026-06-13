'use client'

import { useTranslations } from 'next-intl'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { isDietaryTagKey } from '@/lib/menus/dietary-tags'
import { cn } from '@/lib/utils'

interface DietaryTagPillsProps {
  tags: string[]
  className?: string
  pillClassName?: string
}

export function DietaryTagPills({ tags, className, pillClassName }: DietaryTagPillsProps) {
  const t = useTranslations('DietaryTags')
  if (tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {tags.map((tag) => {
        const label = isDietaryTagKey(tag) ? t(tag) : tag
        return (
          <Tooltip key={tag}>
            <TooltipTrigger asChild>
              <span
                aria-label={`${tag}: ${label}`}
                tabIndex={0}
                className={cn(
                  'bg-accent/30 text-foreground focus-visible:ring-foreground rounded-[6px] px-2 py-0.5 text-[10px] font-semibold tracking-[0.1em] uppercase focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  pillClassName,
                )}
              >
                {tag}
              </span>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
