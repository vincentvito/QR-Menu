// Derive a human-readable display name from a user's name + email. If name
// is missing (common with OTP-only signups), fall back to the email's local
// part, formatted nicely: `vlad.palacio@x.com` → `Vlad Palacio`.
export function formatDisplayName(name: string | null | undefined, email: string): string {
  const trimmed = name?.trim()
  if (trimmed) return trimmed
  const localPart = email.split('@')[0] ?? email
  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}
