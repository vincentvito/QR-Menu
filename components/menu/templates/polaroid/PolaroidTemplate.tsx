import { PolaroidBody } from './PolaroidBody'
import type { TemplateDef } from '@/components/menu/templates/types'

// Server-safe metadata for the Polaroid template. The interactive deck body
// lives in the client sibling so API routes can still import template ids.
export const PolaroidTemplate: TemplateDef = {
  id: 'polaroid',
  label: 'Polaroid',
  description:
    'A playful swipeable photo deck with dish notes below each image and floating category buttons.',
  chrome: 'bottom',
  photoFirst: true,
  Body: PolaroidBody,
}
