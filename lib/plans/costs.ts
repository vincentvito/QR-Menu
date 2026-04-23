// Credit cost per AI-powered action. Kept here so it's one file to audit
// when pricing changes and call sites don't hardcode magic numbers.
export const CREDIT_COSTS = {
  MENU_EXTRACTION: 1,
  DISH_IMAGE_GENERATE: 1,
  DISH_IMAGE_ENHANCE: 1,
} as const

export type CreditAction = keyof typeof CREDIT_COSTS
