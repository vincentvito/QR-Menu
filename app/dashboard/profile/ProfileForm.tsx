'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface ProfileFormProps {
  initial: { name: string; email: string }
}

export function ProfileForm({ initial }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initial.name)
  const [saving, setSaving] = useState(false)

  const dirty = name.trim() !== initial.name.trim()

  async function save(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Display name can\u2019t be empty')
      return
    }
    setSaving(true)
    try {
      const res = await authClient.updateUser({ name: trimmed })
      if (res.error) {
        toast.error(res.error.message ?? 'Could not save')
        return
      }
      toast.success('Profile updated')
      router.refresh()
    } catch {
      toast.error('Network error — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={save}
      className="border-cream-line bg-card space-y-5 rounded-2xl border p-8"
    >
      <div className="space-y-2">
        <Label htmlFor="profile-name">Display name</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          placeholder="Your name"
          disabled={saving}
        />
        <p className="text-muted-foreground text-xs">
          Shown to your teammates and in the sidebar.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={initial.email} disabled readOnly />
        <p className="text-muted-foreground text-xs">
          Your login email — can&apos;t be changed yet.
        </p>
      </div>

      <Button type="submit" disabled={saving || !dirty} className="w-full">
        {saving ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            <span>Saving…</span>
          </>
        ) : (
          <span>Save changes</span>
        )}
      </Button>
    </form>
  )
}
