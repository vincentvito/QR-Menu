const KNOWN_ERROR_KEYS = new Map<string, string>([
  ['Provide a URL, pasted text, or a file.', 'menus.provideSource'],
  ['Menu not found', 'common.menuNotFound'],
  ['Not your menu', 'common.notAllowed'],
  ['Restaurant not found', 'common.restaurantNotFound'],
  ['Organization not found', 'admin.organizationNotFound'],
  ['An invitation is already pending for this email', 'invitations.alreadyPending'],
  ['That person is already on this restaurant', 'invitations.alreadyMember'],
  ['Invitation already used or canceled', 'invitations.alreadyUsed'],
  ['Invitation expired', 'invitations.expired'],
  ['This invitation was sent to a different email', 'invitations.differentEmail'],
])

type ApiTranslator = (key: string, values?: Record<string, string | number>) => string

export function translatedApiError(t: ApiTranslator, err: unknown, fallbackKey: string): string {
  if (err instanceof Error) {
    const knownKey = KNOWN_ERROR_KEYS.get(err.message)
    if (knownKey) return t(knownKey)
  }

  return t(fallbackKey)
}
