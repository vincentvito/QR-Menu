'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Loader2, Mail, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatDisplayName } from '@/lib/display-name'

interface MemberRow {
  id: string
  role: string
  createdAt: string
  user: { id: string; name: string; email: string; image: string | null }
}

interface InvitationRow {
  id: string
  email: string
  role: string
  createdAt: string
  expiresAt: string
}

interface StaffPanelProps {
  canManage: boolean
  members: MemberRow[]
  invitations: InvitationRow[]
}

export function StaffPanel({ canManage, members, invitations }: StaffPanelProps) {
  const t = useTranslations('Staff')
  const locale = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'manager' | 'waiter'>('waiter')
  const [sending, setSending] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function sendInvitation(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/restaurant-invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        toast.error(body.error ?? t('errors.sendFailed'))
        return
      }
      toast.success(t('toast.inviteSent', { email: email.trim() }))
      setEmail('')
      router.refresh()
    } finally {
      setSending(false)
    }
  }

  async function revokeInvitation(id: string) {
    setPendingId(id)
    try {
      const res = await fetch(`/api/restaurant-invitations/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(t('errors.revokeFailed'))
        return
      }
      toast.success(t('toast.revoked'))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(t('confirmRemove', { name }))) return
    setPendingId(id)
    try {
      const res = await fetch(`/api/restaurant-members/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error(t('errors.removeFailed'))
        return
      }
      toast.success(t('toast.removed', { name }))
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="text-muted-foreground size-4" aria-hidden="true" />
            <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
              {t('invite.title')}
            </h2>
          </div>
          <form onSubmit={sendInvitation} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <Label htmlFor="invite-email" className="sr-only">
                {t('invite.email')}
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('invite.emailPlaceholder')}
                required
                disabled={sending}
              />
            </div>
            <div>
              <Label htmlFor="invite-role" className="sr-only">
                {t('invite.role')}
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'manager' | 'waiter')}>
                <SelectTrigger id="invite-role" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">{t('roles.waiter')}</SelectItem>
                  <SelectItem value="manager">{t('roles.manager')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              {t('invite.send')}
            </Button>
          </form>
        </section>
      ) : null}

      <section className="border-cream-line bg-card rounded-2xl border p-5">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {t('current.title')}
        </h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">{t('current.empty')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-[color:var(--color-cream-line)]">
            {members.map((m) => {
              const displayName = formatDisplayName(m.user.name, m.user.email)
              const initials =
                displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || '?'
              return (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <Avatar className="size-8">
                    <AvatarImage src={m.user.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-foreground text-background text-[10px]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{displayName}</div>
                    <div className="text-muted-foreground truncate text-xs">{m.user.email}</div>
                  </div>
                  <span className="text-muted-foreground text-xs">{t(`roles.${m.role}`)}</span>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(m.id, displayName)}
                      disabled={pendingId === m.id}
                      aria-label={t('current.removeAria', { name: displayName })}
                    >
                      {pendingId === m.id ? (
                        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      )}
                    </Button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {canManage && invitations.length > 0 ? (
        <section className="border-cream-line bg-card rounded-2xl border p-5">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {t('pending.title')}
          </h2>
          <ul className="mt-3 divide-y divide-[color:var(--color-cream-line)]">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-3">
                <div className="border-cream-line flex size-8 items-center justify-center rounded-full border">
                  <Mail className="text-muted-foreground size-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{i.email}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    {t('pending.expires', {
                      date: new Date(i.expiresAt).toLocaleDateString(locale),
                    })}
                  </div>
                </div>
                <span className="text-muted-foreground text-xs">{t(`roles.${i.role}`)}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeInvitation(i.id)}
                  disabled={pendingId === i.id}
                  aria-label={t('pending.revokeAria', { email: i.email })}
                >
                  {pendingId === i.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
