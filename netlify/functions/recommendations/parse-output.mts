/**
 * Parse OpenAI response output_text to an array of recommendation objects.
 * Shared by: read-thread, prebake script.
 */
import type { OpenAiProduct } from './resolve-recommendations.mjs'

export function parseRecommendations(outputText: string): OpenAiProduct[] {
  if (!outputText?.trim()) return []
  try {
    const parsed = JSON.parse(outputText.trim())
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return []
  }
}
