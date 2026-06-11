import { getDashboardContext } from '@/lib/dashboard/context'
import { getTranslations } from 'next-intl/server'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const [{ session }, t] = await Promise.all([getDashboardContext(), getTranslations('Profile')])

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t('description')}</p>
      </div>

      <ProfileForm
        initial={{
          name: session.user.name ?? '',
          email: session.user.email,
        }}
      />
    </main>
  )
}
