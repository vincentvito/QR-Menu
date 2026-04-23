import { redirect } from 'next/navigation'
import { getDashboardContext } from '@/lib/dashboard/context'
import { getBillingState } from '@/lib/plans/billing-state'
import { PLANS } from '@/lib/plans'
import { BillingPanel } from './BillingPanel'

export default async function BillingPage() {
  const { org, role, scope } = await getDashboardContext()
  if (scope === 'restaurant') redirect('/dashboard/menus')
  const canManage = ['owner', 'admin'].includes(role)
  const state = await getBillingState(org.id)

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your plan, AI credits, and payment details.
        </p>
      </div>

      <BillingPanel
        orgId={org.id}
        canManage={canManage}
        state={state}
        planCatalog={Object.values(PLANS)}
      />
    </main>
  )
}
