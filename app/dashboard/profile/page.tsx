import { getDashboardContext } from '@/lib/dashboard/context'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const { session } = await getDashboardContext()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          How you show up to the rest of your team.
        </p>
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
