import { getSubscriptionAccessState } from '@/lib/plans/subscription-access'

export async function isOrganizationPublished(organizationId: string): Promise<boolean> {
  const access = await getSubscriptionAccessState(organizationId)
  return access.hasActiveSubscription
}
