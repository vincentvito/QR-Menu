'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addTransitionType, forwardRef, startTransition } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

type TransitionType = 'nav-forward' | 'nav-back'

interface TransitionLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, 'href'> {
  href: string
  transitionType: TransitionType
}

export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink(
    { href, transitionType, onClick, replace, scroll, target, download, ...props },
    ref,
  ) {
    const router = useRouter()

    return (
      <Link
        ref={ref}
        href={href}
        replace={replace}
        scroll={scroll}
        target={target}
        download={download}
        onClick={(event) => {
          onClick?.(event)
          if (
            event.defaultPrevented ||
            event.button !== 0 ||
            event.metaKey ||
            event.altKey ||
            event.ctrlKey ||
            event.shiftKey ||
            download ||
            (target && target !== '_self')
          ) {
            return
          }

          event.preventDefault()
          startTransition(() => {
            addTransitionType(transitionType)
            if (replace) {
              router.replace(href, { scroll })
            } else {
              router.push(href, { scroll })
            }
          })
        }}
        {...props}
      />
    )
  },
)
