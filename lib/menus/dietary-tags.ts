export const DIETARY_TAG_KEYS = ['V', 'VG', 'GF', 'DF', 'NF'] as const

export type DietaryTagKey = (typeof DIETARY_TAG_KEYS)[number]

export function isDietaryTagKey(value: string): value is DietaryTagKey {
  return DIETARY_TAG_KEYS.includes(value as DietaryTagKey)
}
