import { publicUrl } from '@/lib/storage/r2'

// Stable R2 key for the template-picker phone mockup. Uploaded once via
// `scripts/upload-template-assets.ts`. Server-side helpers only — client
// receives the URL as a prop from the Settings page.
export const TEMPLATE_PREVIEW_MOCKUP_KEY = 'qrmenucrafter/assets/template-preview-iphone-17-pro.png'

// Original uploaded asset size from `screenslick/public/mockups/...`.
// Keeping this in one place lets the settings preview match the bezel's
// real proportions instead of relying on a guessed ratio.
export const TEMPLATE_PREVIEW_MOCKUP_SIZE = {
  width: 879,
  height: 1832,
} as const

// Final tuned screen insets for the template preview. These start from the
// mockup PNG's transparent window but include the small visual correction
// needed for the menu content to sit flush inside the phone frame.
export const TEMPLATE_PREVIEW_SCREEN_INSETS = {
  top: 47 / TEMPLATE_PREVIEW_MOCKUP_SIZE.height,
  right: 37 / TEMPLATE_PREVIEW_MOCKUP_SIZE.width,
  bottom: 42 / TEMPLATE_PREVIEW_MOCKUP_SIZE.height,
  left: 38 / TEMPLATE_PREVIEW_MOCKUP_SIZE.width,
} as const

export function templatePreviewMockupUrl(): string {
  return publicUrl(TEMPLATE_PREVIEW_MOCKUP_KEY)
}
