import { customAlphabet } from 'nanoid'

// Lowercase alphanumeric, no lookalikes — 6 chars ~= 57M combos.
const nano = customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', 6)

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'menu'
  )
}

// `maison-rustique-a3f8kq` — readable + globally unique.
export function makeSlug(restaurantName: string): string {
  return `${slugify(restaurantName)}-${nano()}`
}
