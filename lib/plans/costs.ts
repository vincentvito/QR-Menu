// Credit cost per AI-powered action. Kept here so it's one file to audit
// when pricing changes and call sites don't hardcode magic numbers.
//
// Menu extraction (URL scrape / PDF parse / text → structured items) is free:
// it's one-time per menu and the marginal Gemini cost is negligible. Credits
// gate the per-dish image work, which is the real cost driver.
export const CREDIT_COSTS = {
  DISH_IMAGE_GENERATE: 1,
  DISH_IMAGE_ENHANCE: 1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS
