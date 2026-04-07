/**
 * Background service worker.
 * Handles all API calls (runs in extension origin, no CORS issues).
 * Streams results to content script via port messaging.
 */
import {
  parseFinalRecommendations,
  streamEventToMessage,
} from '../../app/lib/stream-recommendations'

const API_HOST = import.meta.env.API_HOST as string

const VERDICT_RE = /"verdict"\s*:\s*"(up|down)"/
const REASON_RE = /"reason"\s*:\s*"((?:[^"\\]|\\.)*)"/
const SOURCES_RE = /"sources"\s*:\s*\[((?:[^\]])*)\]/

function tryExtractVerdict(text: string) {
  const vm = text.match(VERDICT_RE)
  const rm = text.match(REASON_RE)
  if (!vm || !rm) return null
  const sources: string[] = []
  const sm = text.match(SOURCES_RE)
  if (sm) {
    for (const m of sm[1].matchAll(/"(https?:\/\/[^"]+)"/g)) sources.push(m[1])
  }
  return {
    verdict: vm[1],
    reason: rm[1].replace(/\\"/g, '"').replace(/\\n/g, ' '),
    sources,
  }
}

async function handleEvaluate(product: Record<string, unknown>, port: chrome.runtime.Port) {
  try {
    const res = await fetch(`${API_HOST}/api/evaluate-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      port.postMessage({ type: 'error', error: (err as { error?: string })?.error || `Request failed (${res.status})` })
      return
    }

    if (!res.body) {
      port.postMessage({ type: 'error', error: 'No response body' })
      return
    }

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
          if (msg) port.postMessage({ type: 'status', message: msg })

          if (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string') {
            outputText += event.delta
          }
          if (event?.type === 'response.output_text.done' && typeof event?.text === 'string') {
            outputText = event.text
          }
        } catch { /* skip */ }
      }

      if (!verdictEmitted) {
        const early = tryExtractVerdict(outputText)
        if (early) {
          verdictEmitted = true
          port.postMessage({ type: 'verdict', data: early })
        }
      }
    }

    // Parse final
    if (!outputText.trim()) {
      port.postMessage({ type: 'error', error: 'No response from server' })
      return
    }

    const { list, parseSucceeded } = parseFinalRecommendations(outputText)
    let result = null
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
      if (list.length > 0) {
        result = { verdict: 'down', reason: 'We found some better options for you.', sources: [], alternatives: list }
      }
    }

    if (result) {
      port.postMessage({ type: 'result', data: result })
    } else {
      port.postMessage({ type: 'error', error: parseSucceeded ? 'Unexpected response format' : 'Failed to parse evaluation' })
    }
  } catch (err) {
    port.postMessage({ type: 'error', error: err instanceof Error ? err.message : 'Something went wrong' })
  }
}

async function handleResolve(product: Record<string, unknown>, port: chrome.runtime.Port, index: number) {
  try {
    const res = await fetch(`${API_HOST}/api/resolve-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendation: product }),
    })
    const data = await res.json()
    if (data.valid) {
      port.postMessage({ type: 'resolved', index, data: data.product })
    } else {
      port.postMessage({ type: 'resolved', index, data: null })
    }
  } catch {
    port.postMessage({ type: 'resolved', index, data: null })
  }
}

// Port-based messaging for streaming
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'bindiving') return

  port.onMessage.addListener((msg) => {
    if (msg.type === 'evaluate') {
      handleEvaluate(msg.product, port)
    }
    if (msg.type === 'resolve') {
      handleResolve(msg.product, port, msg.index)
    }
  })
})

// Icon click toggles panel
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PANEL' })
  }
})
