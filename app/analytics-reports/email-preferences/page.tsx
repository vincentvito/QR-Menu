import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import {
  AnalyticsReportResultCard,
  type AnalyticsReportResultStatus,
} from '../_components/status-card'

interface PageProps {
  searchParams: Promise<{ status?: string; restaurant?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('AnalyticsReportEmailPreferences')
  return { title: t('metadataTitle'), robots: { index: false, follow: false } }
}

export default async function AnalyticsReportEmailPreferencesPage({ searchParams }: PageProps) {
  const { status, restaurant } = await searchParams
  const validStatus: AnalyticsReportResultStatus =
    status === 'verified' || status === 'unsubscribed' ? status : 'invalid'

  return <AnalyticsReportResultCard status={validStatus} restaurant={restaurant} />
}
