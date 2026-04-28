'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2, Mail, QrCode, ShieldCheck, Sparkles } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OtpInput } from '@/components/auth/OtpInput'

const OTP_LENGTH = 6

const highlights = [
  { icon: QrCode, label: 'Live QR menus' },
  { icon: Sparkles, label: 'AI dish photos' },
  { icon: ShieldCheck, label: 'Beautiful menus in seconds' },
]

interface LoginFormProps {
  callbackUrl: string
}

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const t = useTranslations('Auth')
  const router = useRouter()
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inFlightRef = useRef(false)

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault()
    if (inFlightRef.current) return
    const normalized = email.trim().toLowerCase()
    if (!normalized) return
    inFlightRef.current = true
    setLoading(true)
    setError('')
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: normalized,
        type: 'sign-in',
      })
      if (res.error) {
        setError(res.error.message ?? t('errors.sendFailed'))
      } else {
        setEmail(normalized)
        setStep('otp')
      }
    } catch {
      setError(t('errors.sendFailed'))
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  async function verifyOtp(code: string) {
    if (inFlightRef.current) return
    inFlightRef.current = true
    setLoading(true)
    setError('')
    try {
      const res = await authClient.signIn.emailOtp({ email, otp: code })
      if (res.error) {
        setError(res.error.message ?? t('errors.invalidCode'))
        setOtp(Array(OTP_LENGTH).fill(''))
      } else {
        router.replace(callbackUrl)
      }
    } catch {
      setError(t('errors.verifyFailed'))
      setOtp(Array(OTP_LENGTH).fill(''))
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  function resetEmailStep() {
    setStep('email')
    setError('')
    setOtp(Array(OTP_LENGTH).fill(''))
  }

  const emailErrorId = 'email-error'
  const otpErrorId = 'otp-error'
  const otpHeadingId = 'otp-heading'

  return (
    <div className="border-cream-line bg-card/75 rounded-[28px] border p-5 shadow-[0_22px_70px_rgba(26,30,23,0.12)] backdrop-blur sm:p-6">
      <div className="mb-6 flex flex-wrap gap-2">
        {highlights.map(({ icon: Icon, label }) => (
          <span
            key={label}
            className="bg-background/80 text-foreground/78 border-cream-line inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium"
          >
            <Icon className="text-pop size-3.5" aria-hidden="true" />
            {label}
          </span>
        ))}
      </div>

      {step === 'email' ? (
        <form onSubmit={sendOtp} className="space-y-5" noValidate>
          <div className="space-y-2">
            <h2 className="text-[1.7rem] leading-tight font-semibold tracking-[-0.035em]">
              {t('signIn')}
            </h2>
            <p className="text-muted-foreground text-sm leading-6">
              Enter your work email and we&apos;ll send a secure sign-in code.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <div className="relative">
              <Mail
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? emailErrorId : undefined}
                className="bg-background/90 h-12 rounded-xl pl-10 text-base shadow-none"
                required
              />
            </div>
          </div>

          {error && (
            <p
              id={emailErrorId}
              role="alert"
              aria-live="polite"
              className="text-destructive text-sm"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="bg-foreground text-background hover:bg-foreground/90 h-12 w-full rounded-xl text-base"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">{t('loading')}</span>
              </>
            ) : (
              <>
                <Mail className="size-4" aria-hidden="true" />
                {t('sendCode')}
              </>
            )}
          </Button>
        </form>
      ) : (
        <div className="space-y-5">
          <button
            type="button"
            onClick={resetEmailStep}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="size-3" aria-hidden="true" />
            {t('back')}
          </button>

          <div className="space-y-2">
            <h2
              id={otpHeadingId}
              className="text-[1.7rem] leading-tight font-semibold tracking-[-0.035em]"
            >
              {t('checkEmail')}
            </h2>
            <p className="text-muted-foreground text-sm leading-6 break-words">
              {t.rich('codeSent', {
                email: () => <span className="text-foreground font-semibold">{email}</span>,
              })}
            </p>
          </div>

          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={verifyOtp}
            disabled={loading}
            labelledBy={otpHeadingId}
            describedBy={error ? otpErrorId : undefined}
            invalid={Boolean(error)}
            className="[&_input]:bg-background/90 [&_input]:h-13 [&_input]:rounded-xl [&_input]:shadow-none"
          />

          {error && (
            <p id={otpErrorId} role="alert" aria-live="polite" className="text-destructive text-sm">
              {error}
            </p>
          )}

          {loading && (
            <div className="flex justify-center" aria-hidden="true">
              <Loader2 className="text-muted-foreground size-4 animate-spin" />
            </div>
          )}

          <p className="text-muted-foreground text-center text-sm">
            {t('noCode')}{' '}
            <button
              type="button"
              onClick={() => {
                setError('')
                sendOtp()
              }}
              className="text-foreground font-semibold underline-offset-2 hover:underline disabled:opacity-50"
              disabled={loading}
            >
              {t('resend')}
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
