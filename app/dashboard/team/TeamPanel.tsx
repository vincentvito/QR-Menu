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
import { SectionHeading } from '@/components/ui/section-heading'

interface Member {
  id: string
  role: string
  createdAt: string
  user: { id: string; name: string; email: string; image: string | null }
}

interface Invitation {
  id: string
  email: string
  role: string
  expiresAt: string
}

interface TeamPanelProps {
  canManage: boolean
  viewerUserId: string
  members: Member[]
  invitations: Invitation[]
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export function TeamPanel({ canManage, viewerUserId, members, invitations }: TeamPanelProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [sending, setSending] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not send invite')
        return
      }
      toast.success(`Invitation sent to ${trimmed}`)
      setEmail('')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSending(false)
    }
  }

  async function cancelInvite(id: string) {
    setCancellingId(id)
    try {
      const res = await fetch(`/api/invitations?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Could not cancel')
        return
      }
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <div className="space-y-8">
      {canManage && (
        <section className="border-cream-line bg-card rounded-2xl border p-6">
          <SectionHeading className="mb-4">Invite someone</SectionHeading>
          <form onSubmit={sendInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                autoComplete="email"
                placeholder="teammate@restaurant.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={sending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as 'admin' | 'member')}
                disabled={sending}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={sending || !email.trim()} className="w-full">
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <UserPlus className="size-4" aria-hidden="true" />
                  <span>Send invite</span>
                </>
              )}
            </Button>
          </form>
          <p className="text-muted-foreground mt-3 text-xs">
            <strong>Member</strong> can edit menus. <strong>Admin</strong> can also edit restaurant
            settings and invite other teammates.
          </p>
        </section>
      )}

      <section>
        <SectionHeading className="mb-3">Members ({members.length})</SectionHeading>
        <ul className="border-cream-line divide-cream-line bg-card divide-y overflow-hidden rounded-2xl border">
          {members.map((m) => {
            const initials =
              m.user.name
                ?.split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) ||
              m.user.email[0]?.toUpperCase() ||
              '?'
            const isViewer = m.user.id === viewerUserId
            return (
              <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                <Avatar className="size-9">
                  <AvatarImage src={m.user.image ?? undefined} alt="" />
                  <AvatarFallback className="bg-foreground text-background text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{m.user.name || m.user.email}</span>
                    {isViewer && <span className="text-muted-foreground text-xs">(you)</span>}
                  </div>
                  <div className="text-muted-foreground truncate text-xs">{m.user.email}</div>
                </div>
                <span className="border-cream-line bg-background text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 text-xs">
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {invitations.length > 0 && (
        <section>
          <SectionHeading className="mb-3">
            Pending invitations ({invitations.length})
          </SectionHeading>
          <ul className="border-cream-line divide-cream-line bg-card divide-y overflow-hidden rounded-2xl border">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-4">
                <div className="bg-background text-muted-foreground border-cream-line flex size-9 items-center justify-center rounded-full border">
                  <Mail className="size-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{inv.email}</div>
                  <div className="text-muted-foreground truncate text-xs">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <span className="border-cream-line bg-background text-muted-foreground shrink-0 rounded-full border px-2.5 py-0.5 text-xs">
                  {ROLE_LABEL[inv.role] ?? inv.role}
                </span>
                {canManage && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Cancel invitation to ${inv.email}`}
                    disabled={cancellingId === inv.id}
                    onClick={() => cancelInvite(inv.id)}
                  >
                    {cancellingId === inv.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 className="size-4" aria-hidden="true" />
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
