'use client'

import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  value: string[]
  onChange: (next: string[]) => void
  onComplete?: (code: string) => void
  disabled?: boolean
  length?: number
  className?: string
  labelledBy?: string
  describedBy?: string
  invalid?: boolean
}

// Segmented OTP input. Handles paste, auto-advance, and backspace.
// Calls `onComplete` once every slot is filled.
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  length = 6,
  className,
  labelledBy,
  describedBy,
  invalid,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function writeDigits(startIndex: number, digits: string[]) {
    const next = [...value]
    digits.forEach((d, i) => {
      if (startIndex + i < length) next[startIndex + i] = d
    })
    onChange(next)

    const lastFilled = Math.min(startIndex + digits.length, length - 1)
    refs.current[lastFilled]?.focus()

    if (next.every((d) => d !== '') && onComplete) {
      onComplete(next.join(''))
    }
  }

  function handleChange(index: number, raw: string) {
    if (raw.length > 1) {
      const digits = raw.replace(/\D/g, '').slice(0, length).split('')
      writeDigits(index, digits)
      return
    }
    const digit = raw.replace(/\D/g, '')
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < length - 1) refs.current[index + 1]?.focus()
    if (next.every((d) => d !== '') && onComplete) onComplete(next.join(''))
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus()
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={cn('flex justify-center gap-2', className)}
    >
      {value.map((digit, i) => (
        <Input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={length}
          // Lets iOS / Android auto-fill the code from SMS or email.
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="h-12 w-11 text-center text-lg font-semibold"
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}
