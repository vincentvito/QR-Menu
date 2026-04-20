// Supported menu currencies. Ordered by rough frequency of restaurant use.
// Kept as a short, hand-curated list — we can expand later.
export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'US dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British pound' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian dollar' },
  { code: 'AUD', symbol: 'A$', label: 'Australian dollar' },
  { code: 'AED', symbol: 'AED', label: 'UAE dirham' },
  { code: 'MXN', symbol: 'MX$', label: 'Mexican peso' },
  { code: 'BRL', symbol: 'R$', label: 'Brazilian real' },
  { code: 'JPY', symbol: '¥', label: 'Japanese yen' },
  { code: 'CHF', symbol: 'Fr', label: 'Swiss franc' },
] as const

export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const DEFAULT_CURRENCY: CurrencyCode = 'USD'

const CODES = new Set(CURRENCIES.map((c) => c.code))

export function isSupportedCurrency(x: unknown): x is CurrencyCode {
  return typeof x === 'string' && CODES.has(x as CurrencyCode)
}

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? '$'
}
