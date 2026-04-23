'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
        toast.error(body.error ?? 'Could not send invitation')
        return
      }
      toast.success(`Invitation sent to ${email.trim()}`)
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
        toast.error('Could not revoke invitation')
        return
      }
      toast.success('Invitation revoked')
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  async function removeMember(id: string, name: string) {
    if (!confirm(`Remove ${name} from this restaurant?`)) return
    setPendingId(id)
    try {
      const res = await fetch(`/api/restaurant-members/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Could not remove member')
        return
      }
      toast.success(`${name} removed`)
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
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Invite staff
            </h2>
          </div>
          <form onSubmit={sendInvitation} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <div>
              <Label htmlFor="invite-email" className="sr-only">
                Email
              </Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@example.com"
                required
                disabled={sending}
              />
            </div>
            <div>
              <Label htmlFor="invite-role" className="sr-only">
                Role
              </Label>
              <Select value={role} onValueChange={(v) => setRole(v as 'manager' | 'waiter')}>
                <SelectTrigger id="invite-role" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiter">Waiter</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
              ) : null}
              Send invite
            </Button>
          </form>
        </section>
      ) : null}

      <section className="border-cream-line bg-card rounded-2xl border p-5">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
          Current staff
        </h2>
        {members.length === 0 ? (
          <p className="text-muted-foreground mt-3 text-sm">
            No restaurant-level staff yet. Account owners and admins always have access.
          </p>
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
                  <span className="text-muted-foreground text-xs capitalize">{m.role}</span>
                  {canManage ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMember(m.id, displayName)}
                      disabled={pendingId === m.id}
                      aria-label={`Remove ${displayName}`}
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
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
            Pending invitations
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
                    Expires {new Date(i.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="text-muted-foreground text-xs capitalize">{i.role}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => revokeInvitation(i.id)}
                  disabled={pendingId === i.id}
                  aria-label={`Revoke invitation for ${i.email}`}
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
