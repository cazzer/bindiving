/**
 * Stream parsing and normalization for OpenAI Responses API recommendation output.
 * Defends against: model returns prose/refusal, empty [], markdown code fence,
 * partial JSON, array of non-objects or objects without product_name.
 */

export function stripJsonCodeFence(s) {
  if (!s || typeof s !== 'string') return s
  const trimmed = s.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m)
  return match ? match[1].trim() : trimmed
}

function isValidRecommendation(x) {
  return x && typeof x === 'object' && x.product_name != null
}

/**
 * Extract complete product objects from partial JSON array string (streaming).
 */
export function parsePartialRecommendations(buffer) {
  if (!buffer || typeof buffer !== 'string') return []
  const s = buffer.trim()
  if (!s.startsWith('[')) return []
  let arr = null
  if (s.endsWith(']')) {
    try {
      arr = JSON.parse(s)
    } catch (_) {}
  }
  if (!arr && s.includes(']')) {
    try {
      arr = JSON.parse(s + ']')
    } catch (_) {}
  }
  if (!arr) {
    const last = s.lastIndexOf('},{')
    if (last !== -1) {
      try {
        arr = JSON.parse(s.substring(0, last + 1) + ']')
      } catch (_) {}
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.filter(isValidRecommendation)
}

/**
 * Try to repair model output that sometimes appends garbage to the last URL
 * (e.g. "https://example.com/page.html />}]}").
 */
function repairTrailingUrlGarbage(s) {
  return s.replace(/\s*\/>\s*\]\s*\}\s*\"?\s*$/, '"]}')
}

/**
 * Parse newline-separated JSON objects (NDJSON-style) and return valid recommendations.
 * After split on }\n\n{, first part is complete; later parts need leading { and possibly trailing }.
 */
function parseNewlineSeparatedObjects(s) {
  const repaired = repairTrailingUrlGarbage(s.trim())
  const parts = repaired.split(/\}\s*\n+\s*\{/).filter(Boolean)
  if (parts.length === 0) return []
  const list = []
  for (let i = 0; i < parts.length; i++) {
    const raw = (i === 0 ? parts[i] : '{' + parts[i]).trim()
    for (const toTry of [raw, raw + '}']) {
      try {
        const obj = JSON.parse(toTry)
        if (isValidRecommendation(obj)) {
          list.push(obj)
          break
        }
      } catch (_) {
        continue
      }
    }
  }
  return list
}

/**
 * Parse final stream output. Returns { list, parseSucceeded }.
 * - list: array of valid recommendation objects (have product_name).
 * - parseSucceeded: true if JSON parsed (even if list is empty).
 */
export function parseFinalRecommendations(outputText) {
  const trimmed = (outputText && typeof outputText === 'string' ? outputText : '').trim()
  if (!trimmed) return { list: [], parseSucceeded: false }
  const toParse = stripJsonCodeFence(trimmed)
  for (const candidate of [toParse, repairTrailingUrlGarbage(toParse)]) {
    try {
      const parsed = JSON.parse(candidate)
      const arr = Array.isArray(parsed)
        ? parsed
        : parsed?.recommendations && Array.isArray(parsed.recommendations)
          ? parsed.recommendations
          : []
      const list = arr.filter(isValidRecommendation)
      return { list, parseSucceeded: true }
    } catch (_) {
      continue
    }
  }
  const ndjsonList = parseNewlineSeparatedObjects(toParse)
  if (ndjsonList.length > 0) return { list: ndjsonList, parseSucceeded: true }
  return { list: [], parseSucceeded: false }
}

/**
 * Map OpenAI stream event to short UI status string (or null).
 */
export function streamEventToMessage(event) {
  if (!event || typeof event !== 'object') return null
  const type = event.type
  if (!type || typeof type !== 'string') return null
  if (type === 'keepalive') return 'Rummaging...'
  if (type === 'response.output_item.added') {
    const itemType = event.item?.type
    if (itemType === 'web_search_call') return 'Digging through the web...'
    if (itemType === 'message') return 'Tossing out suggestions...'
  }
  if (type === 'response.output_item.done' && event.item?.type === 'web_search_call') {
    const query = event.item?.action?.query || event.item?.action?.queries?.[0]
    if (query) return `Dug up: ${query}`
    return 'Found some leads.'
  }
  if (type.includes('web_search_call')) {
    if (type.includes('searching')) return 'Digging through the web...'
    if (type.includes('completed')) return 'Found some leads.'
  }
  if (type === 'response.output_text.annotation.added' && event.annotation?.type === 'url_citation') {
    const title = event.annotation?.title
    if (title) return `Source: ${title}`
  }
  if (type === 'response.output_text.delta') return null
  if (type === 'response.output_text.done') return 'Almost there...'
  if (type === 'response.completed') {
    const outTokens = event.response?.usage?.output_tokens
    if (outTokens != null) return `Done (${outTokens} tokens)`
    return 'Done digging.'
  }
  if (type === 'response.created' || type === 'response.in_progress') return 'Opening the dumpster...'
  return null
}
