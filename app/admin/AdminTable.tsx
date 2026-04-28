'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Ban, CheckCircle2, Loader2, ShieldCheck, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { AdminOrgRow, type AdminOrganization } from './AdminOrgRow'

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  banned: boolean
  banReason: string | null
  organizations: AdminOrganization[]
}

interface AdminTableProps {
  viewerId: string
  users: AdminUser[]
}

export function AdminTable({ viewerId, users }: AdminTableProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function impersonate(userId: string) {
    setPendingId(userId)
    try {
      const res = await authClient.admin.impersonateUser({ userId })
      if (res.error) {
        toast.error(res.error.message ?? 'Impersonation failed')
        return
      }
      startTransition(() => {
        router.push('/dashboard')
        router.refresh()
      })
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setPendingId(null)
    }
  }

  async function toggleBan(user: AdminUser) {
    setPendingId(user.id)
    try {
      if (user.banned) {
        const res = await authClient.admin.unbanUser({ userId: user.id })
        if (res.error) {
          toast.error(res.error.message ?? 'Unban failed')
          return
        }
        toast.success(`${user.email} unbanned`)
      } else {
        const reason = window.prompt('Ban reason (shown on failed logins):') ?? ''
        if (!reason.trim()) return
        const res = await authClient.admin.banUser({
          userId: user.id,
          banReason: reason.trim(),
        })
        if (res.error) {
          toast.error(res.error.message ?? 'Ban failed')
          return
        }
        toast.success(`${user.email} banned`)
      }
      startTransition(() => router.refresh())
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <ul className="border-cream-line divide-cream-line bg-card divide-y overflow-hidden rounded-2xl border">
      {users.map((user) => {
        const isViewer = user.id === viewerId
        const isAdmin = user.role === 'admin'
        const isPending = pendingId === user.id
        return (
          <li key={user.id} className="flex flex-wrap items-start gap-4 px-5 py-4">
            <div className="bg-background text-muted-foreground border-cream-line flex size-9 shrink-0 items-center justify-center rounded-full border">
              {isAdmin ? (
                <ShieldCheck className="size-4" aria-hidden="true" />
              ) : (
                <UserRound className="size-4" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                <span className="truncate">{user.name || user.email}</span>
                {isViewer && <span className="text-muted-foreground text-xs">(you)</span>}
                {isAdmin && (
                  <span className="border-cream-line bg-background text-muted-foreground rounded-full border px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase">
                    Admin
                  </span>
                )}
                {user.banned && (
                  <span className="bg-destructive/10 text-destructive rounded-full px-2 py-0.5 text-[10px] tracking-[0.14em] uppercase">
                    Banned
                  </span>
                )}
              </div>
              <div className="text-muted-foreground mt-0.5 truncate text-xs">
                {user.email} - {user.organizations.length} organization
                {user.organizations.length === 1 ? '' : 's'}
              </div>
              {user.banned && user.banReason && (
                <div className="text-destructive mt-1 truncate text-xs">{user.banReason}</div>
              )}

              {user.organizations.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {user.organizations.map((org) => (
                    <AdminOrgRow key={org.id} org={org} />
                  ))}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending || isViewer}
                onClick={() => impersonate(user.id)}
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="size-3.5" aria-hidden="true" />
                )}
                Impersonate
              </Button>
              <Button
                type="button"
                variant={user.banned ? 'outline' : 'destructive'}
                size="sm"
                disabled={isPending || isViewer}
                onClick={() => toggleBan(user)}
              >
                <Ban className="size-3.5" aria-hidden="true" />
                {user.banned ? 'Unban' : 'Ban'}
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
