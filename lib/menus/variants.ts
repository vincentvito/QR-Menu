// Size/price variants stored as JSON on MenuItem ("variants" column).
// Display rule everywhere: when an item has variants they win over the single
// `price`; `price` is kept in sync with the lowest variant so sorting and
// schema.org offers keep working without joins.

// Type alias (not interface) on purpose: object literal types get an implicit
// index signature, which Prisma's InputJsonValue requires for Json columns.
export type MenuItemVariant = {
  label: string
  price: number
}

export const MAX_VARIANTS = 8
export const MAX_VARIANT_LABEL = 40

// Cleans untrusted input (DB JSON column, request bodies, Gemini output)
// into a valid variant list. Invalid entries are dropped silently.
export function parseVariants(value: unknown): MenuItemVariant[] {
  if (!Array.isArray(value)) return []
  const out: MenuItemVariant[] = []
  for (const entry of value) {
    if (out.length >= MAX_VARIANTS) break
    const obj = entry as Record<string, unknown>
    const label = typeof obj?.label === 'string' ? obj.label.trim().slice(0, MAX_VARIANT_LABEL) : ''
    const raw = typeof obj?.price === 'number' ? obj.price : parseFloat(String(obj?.price))
    if (!label || !Number.isFinite(raw) || raw < 0) continue
    out.push({ label, price: Math.round(raw * 100) / 100 })
  }
  return out
}

export function minVariantPrice(variants: MenuItemVariant[]): number {
  return variants.reduce((min, v) => Math.min(min, v.price), Infinity)
}
