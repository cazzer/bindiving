/**
 * API client for the Chrome extension.
 * Streams from /api/evaluate-product and calls /api/resolve-product.
 * Reuses stream parsers from the main app.
 */
import {
  parseFinalRecommendations,
  streamEventToMessage,
} from '../../app/lib/stream-recommendations'

const API_HOST = import.meta.env.API_HOST as string

export interface ProductInput {
  product_name: string
  price?: string
  category?: string
  asin?: string
}

export interface Alternative {
  product_name: string
  pros: string[]
  cons: string[]
  price: string | null
  amazon_id: string | null
  sources: string[]
}

export interface EvaluationResult {
  verdict: 'up' | 'down'
  reason: string
  sources: string[]
  alternatives: Alternative[]
}

export interface ResolvedProduct extends Alternative {
  amazon_url?: string
  image_url?: string
  brand?: string
  images?: string[]
}

export interface StreamCallbacks {
  onStatus?: (message: string) => void
  onVerdict?: (verdict: { verdict: 'up' | 'down'; reason: string; sources: string[] }) => void
  onResult?: (result: EvaluationResult) => void
  onError?: (error: string) => void
}

// Extract verdict + reason from partial JSON as it streams in.
// Fires early so the UI can show thumbs up/down before alternatives finish.
const VERDICT_RE = /"verdict"\s*:\s*"(up|down)"/
const REASON_RE = /"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/
const SOURCES_RE = /"sources"\s*:\s*\[((?:[^\]])*)\]/

function tryExtractVerdict(text: string): { verdict: 'up' | 'down'; reason: string; sources: string[] } | null {
  const vm = text.match(VERDICT_RE)
  const rm = text.match(REASON_RE)
  if (!vm || !rm) return null
  const sources: string[] = []
  const sm = text.match(SOURCES_RE)
  if (sm) {
    const urlMatches = sm[1].matchAll(/"(https?:\/\/[^"]+)"/g)
    for (const m of urlMatches) sources.push(m[1])
  }
  return {
    verdict: vm[1] as 'up' | 'down',
    reason: rm[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
    sources,
  }
}

export async function evaluateProduct(product: ProductInput, callbacks: StreamCallbacks): Promise<void> {
  const { onStatus, onVerdict, onResult, onError } = callbacks

  try {
    onStatus?.('Diving in...')

    const res = await fetch(`${API_HOST}/api/evaluate-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error || `Request failed (${res.status})`)
    }

    if (!res.body) throw new Error('No response body')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let outputText = ''
    let verdictEmitted = false

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue

        try {
          const event = JSON.parse(payload)
          const msg = streamEventToMessage(event)
          if (msg) onStatus?.(msg)

          if (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string') {
            outputText += event.delta
          }

          if (event?.type === 'response.output_text.done' && typeof event?.text === 'string') {
            outputText = event.text
          }
        } catch {
          // skip unparseable events
        }
      }

      // Try to emit verdict early from partial output
      if (!verdictEmitted && onVerdict) {
        const early = tryExtractVerdict(outputText)
        if (early) {
          verdictEmitted = true
          onVerdict(early)
        }
      }
    }

    // Parse the final output
    if (!outputText.trim()) {
      onError?.('No response from server')
      return
    }

    const { list, parseSucceeded } = parseFinalRecommendations(outputText)

    // The evaluate endpoint returns a single object, not an array
    let result: EvaluationResult | null = null
    try {
      const parsed = JSON.parse(outputText.trim().replace(/^```json?\s*/, '').replace(/```$/, ''))
      if (parsed && typeof parsed.verdict === 'string') {
        result = {
          verdict: parsed.verdict,
          reason: parsed.reason || '',
          sources: Array.isArray(parsed.sources) ? parsed.sources : [],
          alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
        }
      }
    } catch {
      // Fallback: if the model returned an array instead of an object, try list
      if (list.length > 0) {
        result = {
          verdict: 'down',
          reason: 'We found some better options for you.',
          sources: [],
          alternatives: list,
        }
      }
    }

    if (result) {
      onResult?.(result)
    } else {
      onError?.(parseSucceeded ? 'Unexpected response format' : 'Failed to parse evaluation')
    }
  } catch (err) {
    onError?.(err instanceof Error ? err.message : 'Something went wrong')
  }
}

export async function resolveProduct(product: Alternative): Promise<ResolvedProduct | null> {
  try {
    const res = await fetch(`${API_HOST}/api/resolve-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendation: product }),
    })
    const data = await res.json()
    if (data.valid) return data.product
    return null
  } catch {
    return null
  }
}
