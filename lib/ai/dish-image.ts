import 'server-only'

import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! })
const MODEL = 'gemini-3.1-flash-image-preview'

export type { DishContext } from './dish-image-prompts'

export interface GeneratedImage {
  base64: string
  mimeType: string
}

function extractImage(response: unknown): GeneratedImage {
  const r = response as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }>
      }
    }>
  }
  for (const part of r.candidates?.[0]?.content?.parts ?? []) {
    const data = part.inlineData?.data
    const mimeType = part.inlineData?.mimeType
    if (data && mimeType) return { base64: data, mimeType }
  }
  throw new Error('Gemini returned no image')
}

// Low-level: takes a fully-built prompt string. Composition lives in the
// route handler so admins can override the default prompt for diagnostics.
export async function generateDishImage(prompt: string): Promise<GeneratedImage> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
  })
  return extractImage(response)
}

export async function enhanceDishImage(
  sourceBase64: string,
  sourceMimeType: string,
  prompt: string,
): Promise<GeneratedImage> {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ inlineData: { data: sourceBase64, mimeType: sourceMimeType } }, { text: prompt }],
  })
  return extractImage(response)
}
