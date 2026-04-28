'use client'

import { memo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Gift, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const COMP_OPTIONS = [
  { value: 'none', label: 'No comp' },
  { value: 'basic', label: 'Basic' },
  { value: 'pro', label: 'Pro' },
  { value: 'business', label: 'Business' },
  { value: 'enterprise', label: 'Enterprise' },
]

export interface AdminOrganization {
  id: string
  name: string
  compPlan: string | null
  compReason: string | null
  compGrantedAt: Date | null
  monthlyCreditsRemaining: number
  bonusCreditsRemaining: number
  restaurantCount: number
  menuCount: number
  planName: string
  subscriptionStatus: string | null
  subscriptionPlan: string | null
  billingInterval: string | null
}

interface AdminOrgRowProps {
  org: AdminOrganization
}

export const AdminOrgRow = memo(function AdminOrgRow({ org }: AdminOrgRowProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [isSavingComp, setIsSavingComp] = useState(false)
  const [isGrantingCredits, setIsGrantingCredits] = useState(false)
  const [compDraft, setCompDraft] = useState({
    compPlan: org.compPlan ?? 'none',
    compReason: org.compReason ?? '',
  })
  const [creditDraft, setCreditDraft] = useState({ amount: '', reason: '' })

  const compDirty =
    compDraft.compPlan !== (org.compPlan ?? 'none') ||
    compDraft.compReason !== (org.compReason ?? '')
  const isBusy = isSavingComp || isGrantingCredits

  async function saveComp() {
    setIsSavingComp(true)
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/comp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          compPlan: compDraft.compPlan === 'none' ? null : compDraft.compPlan,
          compReason: compDraft.compPlan === 'none' ? null : compDraft.compReason,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not update comp plan')
        return
      }
      toast.success(
        compDraft.compPlan === 'none' ? `${org.name} comp revoked` : `${org.name} comp updated`,
      )
      startTransition(() => router.refresh())
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setIsSavingComp(false)
    }
  }

  async function grantCredits() {
    const amount = Number(creditDraft.amount)
    if (!Number.isInteger(amount) || amount <= 0) {
      toast.error('Enter a positive whole number of credits')
      return
    }

    setIsGrantingCredits(true)
    try {
      const res = await fetch(`/api/admin/organizations/${org.id}/credits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          reason: creditDraft.reason,
        }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not add credits')
        return
      }
      toast.success(`${amount} credits added to ${org.name}`)
      setCreditDraft({ amount: '', reason: '' })
      startTransition(() => router.refresh())
    } catch {
      toast.error('Network error - please try again')
    } finally {
      setIsGrantingCredits(false)
    }
  }

  return (
    <div className="border-cream-line bg-background/70 rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Building2 className="text-muted-foreground size-3.5" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium">{org.name}</span>
        {org.compPlan ? (
          <span className="border-accent/30 bg-accent/10 text-accent inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] uppercase">
            <Gift className="size-3" aria-hidden="true" />
            Comp {org.planName}
          </span>
        ) : null}
      </div>
      <div className="text-muted-foreground mt-1 text-xs">
        {org.restaurantCount} restaurant{org.restaurantCount === 1 ? '' : 's'} - {org.menuCount}{' '}
        menu{org.menuCount === 1 ? '' : 's'} -{' '}
        {org.monthlyCreditsRemaining + org.bonusCreditsRemaining} credits -{' '}
        {org.subscriptionStatus
          ? `${org.subscriptionPlan ?? org.planName} ${org.subscriptionStatus}${
              org.billingInterval ? ` (${org.billingInterval})` : ''
            }`
          : 'No Stripe subscription'}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Select
          value={compDraft.compPlan}
          onValueChange={(value) => setCompDraft((current) => ({ ...current, compPlan: value }))}
          disabled={isBusy}
        >
          <SelectTrigger size="sm" className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COMP_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={compDraft.compReason}
          onChange={(event) =>
            setCompDraft((current) => ({ ...current, compReason: event.target.value }))
          }
          placeholder="Reason, e.g. internal"
          maxLength={80}
          disabled={isBusy || compDraft.compPlan === 'none'}
          className="h-8 min-w-[160px] flex-1 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isSavingComp || !compDirty}
          onClick={saveComp}
        >
          {isSavingComp ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-3.5" aria-hidden="true" />
          )}
          Save
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          inputMode="numeric"
          value={creditDraft.amount}
          onChange={(event) =>
            setCreditDraft((current) => ({ ...current, amount: event.target.value }))
          }
          placeholder="Credits"
          disabled={isBusy}
          className="h-8 w-[100px] text-xs"
        />
        <Input
          value={creditDraft.reason}
          onChange={(event) =>
            setCreditDraft((current) => ({ ...current, reason: event.target.value }))
          }
          placeholder="Reason, e.g. owner top-up"
          maxLength={120}
          disabled={isBusy}
          className="h-8 min-w-[180px] flex-1 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isGrantingCredits || !creditDraft.amount.trim()}
          onClick={grantCredits}
        >
          {isGrantingCredits ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Gift className="size-3.5" aria-hidden="true" />
          )}
          Add credits
        </Button>
      </div>
    </div>
  )
})
