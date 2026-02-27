import { STREAM_ENABLED } from '../../config'
import {
  parsePartialRecommendations,
  parseFinalRecommendations,
  streamEventToMessage
} from '../../app/lib/stream-recommendations'

const POLL_INTERVAL_MS = 3000
const POLL_STATUS_MESSAGES = ['Checking the bin...', 'Still digging...', 'Almost there...']

/**
 * Search for product recommendations
 * @param {Object} params
 * @param {string} params.query - Search query
 * @param {string} params.recaptchaToken - reCAPTCHA token
 * @param {Function} params.onStatusUpdate - Callback for status updates (optional)
 * @returns {Promise<{status: 'success'|'error', data?, error?, metadata?}>}
 */
export async function searchRecommendations({ query, recaptchaToken, onStatusUpdate }) {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  const mode = STREAM_ENABLED ? 'streaming' : 'polling'

  if (mode === 'streaming') {
    return streamingSearch({ query, recaptchaToken, origin, onStatusUpdate })
  } else {
    return pollingSearch({ query, recaptchaToken, origin, onStatusUpdate })
  }
}

/**
 * Get more options for an existing search
 * @param {Object} params
 * @param {string} params.responseId - Previous response ID
 * @param {string} params.recaptchaToken - reCAPTCHA token
 * @param {Function} params.onStatusUpdate - Callback for status updates
 * @returns {Promise<{status: 'success'|'error', data?, error?, metadata?}>}
 */
export async function getMoreOptions({ responseId, recaptchaToken, onStatusUpdate }) {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  const mode = STREAM_ENABLED ? 'streaming' : 'polling'

  if (mode === 'streaming') {
    return streamingMoreOptions({ responseId, recaptchaToken, origin, onStatusUpdate })
  } else {
    return pollingMoreOptions({ responseId, recaptchaToken, origin, onStatusUpdate })
  }
}

/**
 * Resolve a single product to get Amazon link and image
 * @param {Object} product - Raw product recommendation
 * @returns {Promise<{status: 'success'|'error', data?, error?}>}
 */
export async function resolveProduct(product) {
  const origin = typeof location !== 'undefined' ? location.origin : ''
  
  try {
    const res = await fetch(`${origin}/api/resolve-product`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendation: product })
    })
    const data = await res.json()
    
    if (data.valid) {
      return { status: 'success', data: data.product }
    } else {
      return { 
        status: 'error', 
        error: { message: data.message || "Couldn't load link" }
      }
    }
  } catch (err) {
    return { 
      status: 'error', 
      error: { message: err.message || "Couldn't load link" }
    }
  }
}

// ============================================================================
// STREAMING MODE
// ============================================================================

async function streamingSearch({ query, recaptchaToken, origin, onStatusUpdate }) {
  try {
    onStatusUpdate?.('Opening the dumpster...')
    
    const res = await fetch(`${origin}/api/stream-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, recaptcha: recaptchaToken })
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error || res.statusText || 'Stream failed')
    }

    return await consumeStream(res, { onStatusUpdate, append: false, query })
  } catch (err) {
    return {
      status: 'error',
      error: { message: err.message || 'Streaming failed', originalError: err },
      metadata: { mode: 'streaming', query }
    }
  }
}

async function streamingMoreOptions({ responseId, recaptchaToken, origin, onStatusUpdate }) {
  try {
    onStatusUpdate?.('Opening the dumpster...')
    
    const res = await fetch(`${origin}/api/stream-search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previous_response_id: responseId, recaptcha: recaptchaToken })
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody?.error || res.statusText || 'Stream failed')
    }

    return await consumeStream(res, { onStatusUpdate, append: true, previousResponseId: responseId })
  } catch (err) {
    return {
      status: 'error',
      error: { message: err.message || 'Streaming failed', originalError: err },
      metadata: { mode: 'streaming', responseId }
    }
  }
}

async function consumeStream(res, { onStatusUpdate, append, query, previousResponseId }) {
  if (!res.body) throw new Error('No response body')
  
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let responseId = null
  let outputText = ''
  const rawRecommendations = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        
        try {
          const event = JSON.parse(payload)
          const msg = streamEventToMessage(event)
          if (msg) onStatusUpdate?.(msg)
          
          if (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string') {
            outputText += event.delta
            if (!msg && outputText.includes('"steps"') && parsePartialRecommendations(outputText).length === 0) {
              onStatusUpdate?.('Mapping the dumpster…')
            } else if (!msg) {
              onStatusUpdate?.('Tossing out suggestions...')
            }
          }
          
          if (event?.type === 'response.output_text.done' && typeof event?.text === 'string') {
            outputText = event.text
          }
          
          if (event?.type === 'response.completed' || event?.type === 'response.created') {
            const id = event?.response?.id ?? event?.id
            if (id) responseId = id
          }
        } catch (_) {}
      }
    }
    
    // Check for new partial recommendations during streaming
    const partial = parsePartialRecommendations(outputText)
    if (partial.length > rawRecommendations.length) {
      const newRaws = partial.slice(rawRecommendations.length)
      if (rawRecommendations.length === 0 && newRaws[0]?.product_name) {
        onStatusUpdate?.(`Pulled out: ${newRaws[0].product_name}`)
      }
      rawRecommendations.push(...newRaws)
    }
  }

  // Stream complete, parse final results
  if (rawRecommendations.length === 0 && outputText.trim()) {
    const { list: finalList, parseSucceeded } = parseFinalRecommendations(outputText)
    const listToUse = finalList.length > 0 ? finalList : parsePartialRecommendations(outputText)
    
    if (listToUse.length > 0) {
      onStatusUpdate?.('Checking the finds...')
      return {
        status: 'success',
        data: listToUse,
        metadata: { responseId, mode: 'streaming', append, count: listToUse.length }
      }
    } else {
      const apiMessage = outputText.trim()
      const message = parseSucceeded
        ? 'No results'
        : apiMessage.length > 0
          ? (apiMessage.length > 500 ? apiMessage.slice(0, 500) + '…' : apiMessage)
          : 'Could not get recommendations from stream.'
      
      return {
        status: 'error',
        error: { 
          message, 
          parseFailure: !parseSucceeded,
          outputLength: outputText.length,
          outputPreview: apiMessage.slice(0, 500)
        },
        metadata: { responseId, mode: 'streaming', append, query }
      }
    }
  } else if (rawRecommendations.length === 0) {
    const message = outputText.trim().length > 0
      ? outputText.trim()
      : responseId
        ? 'Could not get recommendations from stream.'
        : 'Stream ended without response id'
    
    return {
      status: 'error',
      error: { message },
      metadata: { responseId, mode: 'streaming', append }
    }
  }

  // We got partial recommendations during streaming
  return {
    status: 'success',
    data: rawRecommendations,
    metadata: { responseId, mode: 'streaming', append, count: rawRecommendations.length }
  }
}

// ============================================================================
// POLLING MODE
// ============================================================================

async function pollingSearch({ query, recaptchaToken, origin, onStatusUpdate }) {
  try {
    const res = await fetch(
      `${origin}/api/assistant?query=${encodeURIComponent(query)}&recaptcha=${recaptchaToken}`,
      { method: 'POST' }
    )
    const data = await res.json()
    
    if (data?.response?.id == null) {
      return {
        status: 'error',
        error: { message: data?.message ?? 'No response ID returned from assistant' },
        metadata: { mode: 'polling', query }
      }
    }
    
    return await pollForResults({
      responseId: data.response.id,
      origin,
      onStatusUpdate,
      append: false
    })
  } catch (err) {
    return {
      status: 'error',
      error: { message: err.message ?? 'Request failed', originalError: err },
      metadata: { mode: 'polling', query }
    }
  }
}

async function pollingMoreOptions({ responseId, recaptchaToken, origin, onStatusUpdate }) {
  try {
    const res = await fetch(`${origin}/api/more-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previous_response_id: responseId, recaptcha: recaptchaToken })
    })
    const data = await res.json()
    
    if (!data?.response?.id) {
      return {
        status: 'error',
        error: { message: data?.message ?? 'No response from server' },
        metadata: { mode: 'polling', previousResponseId: responseId }
      }
    }
    
    return await pollForResults({
      responseId: data.response.id,
      origin,
      onStatusUpdate,
      append: true
    })
  } catch (err) {
    return {
      status: 'error',
      error: { message: err.message ?? 'Failed to get more options', originalError: err },
      metadata: { mode: 'polling', previousResponseId: responseId }
    }
  }
}

async function pollForResults({ responseId, origin, onStatusUpdate, append }) {
  const url = `${origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}&raw=1`
  let pollCount = 0
  
  for (;;) {
    onStatusUpdate?.(POLL_STATUS_MESSAGES[pollCount % POLL_STATUS_MESSAGES.length])
    pollCount += 1
    
    const res = await fetch(url, { method: 'GET' })
    const data = await res.json()
    
    if (data.status === 'pending' || res.status === 202) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
      continue
    }
    
    const rawList = data.valid && Array.isArray(data.recommendations) ? data.recommendations : []
    
    if (rawList.length === 0 && !data.valid) {
      return {
        status: 'error',
        error: { message: data.message || 'No results' },
        metadata: { responseId, mode: 'polling', append }
      }
    }
    
    return {
      status: 'success',
      data: rawList,
      metadata: { responseId, mode: 'polling', append, count: rawList.length }
    }
  }
}
