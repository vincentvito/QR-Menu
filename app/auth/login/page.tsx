'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { authClient, useSession } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OtpInput } from '@/components/auth/OtpInput'
import { BrandMark } from '@/components/brand/BrandMark'

const OTP_LENGTH = 6

export default function LoginPage() {
  const t = useTranslations('Auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawCallback = searchParams.get('callbackUrl') || '/dashboard'
  const callbackUrl =
    rawCallback.startsWith('/') && !rawCallback.startsWith('//') ? rawCallback : '/dashboard'
  const { data: session } = useSession()

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inFlightRef = useRef(false)

  useEffect(() => {
    if (session) router.push(callbackUrl)
  }, [session, router, callbackUrl])

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
        router.push(callbackUrl)
      }
    } catch {
      setError(t('errors.verifyFailed'))
      setOtp(Array(OTP_LENGTH).fill(''))
    } finally {
      inFlightRef.current = false
      setLoading(false)
    }
  }

  const emailErrorId = 'email-error'
  const otpErrorId = 'otp-error'
  const otpHeadingId = 'otp-heading'

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="bg-background flex min-h-screen items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Qtable home">
            <BrandMark size="lg" />
          </Link>
        </div>

        {/* Stable page heading — visually hidden so each step can show its own title. */}
        <h1 className="sr-only">{t('signIn')}</h1>

        <div className="border-border bg-card rounded-2xl border p-8 shadow-sm">
          {step === 'email' ? (
            <form onSubmit={sendOtp} className="space-y-5" noValidate>
              <div className="space-y-1.5 text-center">
                <h2 className="text-2xl font-medium tracking-tight">{t('signIn')}</h2>
                <p className="text-muted-foreground text-sm">{t('sendCodePrompt')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('emailLabel')}</Label>
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
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p
                  id={emailErrorId}
                  role="alert"
                  aria-live="polite"
                  className="text-destructive text-center text-xs"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="h-12 w-full text-base sm:h-10 sm:text-sm"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span className="sr-only">{t('loading')}</span>
                  </>
                ) : (
                  t('sendCode')
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-5">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setError('')
                  setOtp(Array(OTP_LENGTH).fill(''))
                }}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
              >
                <ArrowLeft className="size-3" aria-hidden="true" />
                {t('back')}
              </button>

              <div className="space-y-1.5">
                <h2 id={otpHeadingId} className="text-2xl font-medium tracking-tight">
                  {t('checkEmail')}
                </h2>
                <p className="text-muted-foreground text-sm break-words">
                  {t.rich('codeSent', {
                    email: () => <span className="text-foreground font-medium">{email}</span>,
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
              />

              {error && (
                <p
                  id={otpErrorId}
                  role="alert"
                  aria-live="polite"
                  className="text-destructive text-center text-xs"
                >
                  {error}
                </p>
              )}

              {loading && (
                <div className="flex justify-center" aria-hidden="true">
                  <Loader2 className="text-muted-foreground size-4 animate-spin" />
                </div>
              )}

              <p className="text-muted-foreground text-center text-xs">
                {t('noCode')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    sendOtp()
                  }}
                  className="text-foreground font-medium underline-offset-2 hover:underline disabled:opacity-50"
                  disabled={loading}
                >
                  {t('resend')}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
