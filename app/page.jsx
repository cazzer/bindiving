'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

import ProductCard from '../components/product-card'
import PillSearchBar from '../components/pill-search-bar'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'
import { Footer } from 'components/footer'
import { useSearchUI } from '../contexts/search-ui-context'
import { STREAM_ENABLED } from '../config'

const PLACEHOLDER_LIST = [
  `blister-proof running socks`,
  `extra durable plunger`,
  `hotel-quality pillows`,
  `flowers that don't need water`,
  `bluetooth typewriter`,
  `toe-less socks for sweaty feet`,
  `dark lightbulbs`,
  `annoyingly loud headphones`,
  `dress shoes without soles`,
  `dog leash but for children`,
  `helium-filled dumbbells`,
  `invisible bookshelf`,
  `banana slicer for one`,
  `anti-pigeon spikes for your hat`,
  `portable hole`,
  `left-handed spatula`,
  `emergency inflatable crown`,
  `unnecessarily large spoon`,
  `screaming goat soap dispenser`,
  `nose trimmer for dogs`,
  `gothic fairy garden gnome`,
  `single chopstick`,
  `mood ring for your fridge`,
  `edible candle`
]

const POLL_INTERVAL_MS = 3000

// Map OpenAI stream events to short UI messages (pass full event for richer feedback)
function streamEventToMessage(event) {
  if (!event || typeof event !== 'object') return null
  const type = event.type
  if (!type || typeof type !== 'string') return null
  if (type === 'keepalive') return 'Waiting for response...'
  if (type === 'response.output_item.added') {
    const itemType = event.item?.type
    if (itemType === 'web_search_call') return 'Searching the web...'
    if (itemType === 'message') return 'Writing recommendations...'
  }
  if (type === 'response.output_item.done' && event.item?.type === 'web_search_call') {
    const query = event.item?.action?.query || event.item?.action?.queries?.[0]
    if (query) return `Searched: ${query}`
    return 'Found sources.'
  }
  if (type.includes('web_search_call')) {
    if (type.includes('searching')) return 'Searching the web...'
    if (type.includes('completed')) return 'Found sources.'
  }
  if (type === 'response.output_text.annotation.added' && event.annotation?.type === 'url_citation') {
    const title = event.annotation?.title
    if (title) return `Source: ${title}`
  }
  if (type === 'response.output_text.delta') return null
  if (type === 'response.output_text.done') return 'Almost there...'
  if (type === 'response.completed') {
    const outTokens = event.response?.usage?.output_tokens
    if (outTokens != null) return `Complete (${outTokens} tokens)`
    return 'Complete'
  }
  if (type === 'response.created' || type === 'response.in_progress') return 'Starting...'
  return null
}

const POLL_STATUS_MESSAGES = ['Checking for results...', 'Still digging...', 'Almost there...']

// Strip optional markdown code fence so we can parse e.g. "```json\n[]\n```"
function stripJsonCodeFence(s) {
  if (!s || typeof s !== 'string') return s
  const trimmed = s.trim()
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m)
  return match ? match[1].trim() : trimmed
}

// Extract complete product objects from partial JSON array string (streaming).
function parsePartialRecommendations(buffer) {
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
  return arr.filter((x) => x && typeof x === 'object' && x.product_name != null)
}

function normalizeSource(source) {
  if (source && typeof source === 'object' && source.link != null) {
    return { link: String(source.link), description: source.description != null ? String(source.description) : undefined }
  }
  const s = typeof source === 'string' ? source.trim() : ''
  if (!s) return { link: '', description: undefined }
  const idx = s.indexOf(' (')
  if (idx > 0 && s.includes(')', idx)) {
    return {
      link: s.slice(0, idx).trim(),
      description: s.slice(idx + 2, s.lastIndexOf(')')).trim()
    }
  }
  return { link: s, description: undefined }
}

function wrapAsRecommendationItem(raw, status = 'pending') {
  return {
    ...raw,
    pros: Array.isArray(raw.pros) ? raw.pros : [],
    cons: Array.isArray(raw.cons) ? raw.cons : [],
    sources: Array.isArray(raw.sources) ? raw.sources.map(normalizeSource) : [],
    _resolveStatus: status,
    _resolved: undefined,
    _error: undefined
  }
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)
  const [lastResponseId, setLastResponseId] = useState(null)
  const { executeRecaptcha } = useGoogleReCaptcha()
  const { setHasResults, setSearchProps } = useSearchUI()

  const placeholders = useMemo(
    () => [...PLACEHOLDER_LIST].sort((a, b) => 0.5 - Math.random()),
    []
  )
  const suggested = useMemo(() => placeholders.slice(0, 4), [placeholders])

  const hasResults = Boolean(recResponse?.recommendations?.length)
  useEffect(() => {
    setHasResults(hasResults)
  }, [hasResults, setHasResults])

  const onQueryUpdate = useCallback((event) => {
    setQuery(event.target.value)
  }, [])

  const onSearchRef = useRef(() => {})
  useEffect(() => {
    setSearchProps({
      query,
      onQueryUpdate,
      onSubmit: (e) => onSearchRef.current(e),
      placeholder: 'Search again...'
    })
  }, [query, onQueryUpdate, setSearchProps])

  async function getResolvedRecommendations({ recommendations = null, responseId = null }) {
    const origin = typeof location !== 'undefined' ? location.origin : ''
    if (Array.isArray(recommendations) && recommendations.length > 0) {
      const res = await fetch(`${origin}/api/resolve-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendations })
      })
      return res.json()
    }
    if (responseId) {
      const res = await fetch(`${origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}`, {
        method: 'GET'
      })
      return res.json()
    }
    return { valid: false, message: 'No recommendations or response id' }
  }

  async function resolveOneProduct(index, rawProduct, setRecResponse) {
    const origin = typeof location !== 'undefined' ? location.origin : ''
    try {
      const res = await fetch(`${origin}/api/resolve-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendation: rawProduct })
      })
      const data = await res.json()
      setRecResponse((prev) => {
        const recs = [...(prev?.recommendations ?? [])]
        if (recs[index] == null) return prev
        recs[index] = {
          ...recs[index],
          _resolveStatus: data.valid ? 'resolved' : 'error',
          _resolved: data.valid ? data.product : undefined,
          _error: data.valid ? undefined : (data.message || "Couldn't load link")
        }
        return { ...prev, valid: true, recommendations: recs }
      })
    } catch (_) {
      setRecResponse((prev) => {
        const recs = [...(prev?.recommendations ?? [])]
        if (recs[index] == null) return prev
        recs[index] = { ...recs[index], _resolveStatus: 'error', _error: "Couldn't load link" }
        return { ...prev, valid: true, recommendations: recs }
      })
    }
  }

  async function getRawRecommendations(responseId) {
    const origin = typeof location !== 'undefined' ? location.origin : ''
    const res = await fetch(
      `${origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}&raw=1`,
      { method: 'GET' }
    )
    return res.json()
  }

  async function runPolling(responseId, { append = false } = {}) {
    const url = `${location.origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}&raw=1`
    let pollCount = 0
    for (;;) {
      setStreamStatus(POLL_STATUS_MESSAGES[pollCount % POLL_STATUS_MESSAGES.length])
      pollCount += 1
      const res = await fetch(url, { method: 'GET' })
      const data = await res.json()
      if (data.status === 'pending' || res.status === 202) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        continue
      }
      setStreamStatus(null)
      setApiRequestState('resolved')
      const rawList = data.valid && Array.isArray(data.recommendations) ? data.recommendations : []
      if (rawList.length === 0 && !data.valid) {
        setRecResponse(data)
        return
      }
      const wrapped = rawList.map((r) => wrapAsRecommendationItem(r, 'pending'))
      let startIdx = 0
      setRecResponse((prev) => {
        const base = append ? (prev?.recommendations ?? []) : []
        startIdx = base.length
        return { valid: true, recommendations: [...base, ...wrapped] }
      })
      rawList.forEach((raw, i) => {
        setTimeout(() => resolveOneProduct(startIdx + i, raw, setRecResponse), 0)
      })
      return
    }
  }

  async function consumeStreamAndResolve(res, append) {
    if (!res.body) throw new Error('No response body')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let responseId = null
    let outputText = ''
    const currentRun = []

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
            if (msg) setStreamStatus(msg)
            if (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string') {
              outputText += event.delta
              if (!msg && outputText.includes('"steps"') && parsePartialRecommendations(outputText).length === 0) {
                setStreamStatus('Building plan…')
              } else if (!msg) {
                setStreamStatus('Writing recommendations...')
              }
            }
            if (event?.type === 'response.output_text.done' && typeof event?.text === 'string') {
              outputText = event.text
            }
            if (event?.type === 'response.completed' || event?.type === 'response.created') {
              const id = event?.response?.id ?? event?.id
              if (id) {
                responseId = id
                setLastResponseId(id)
              }
            }
          } catch (_) {}
        }
      }
      const partial = parsePartialRecommendations(outputText)
      if (partial.length > currentRun.length) {
        const newRaws = partial.slice(currentRun.length)
        if (currentRun.length === 0 && newRaws[0]?.product_name) {
          setStreamStatus(`Found: ${newRaws[0].product_name}`)
        }
        newRaws.forEach((raw) => currentRun.push(wrapAsRecommendationItem(raw, 'pending')))
        let resolveStartIdx = 0
        setRecResponse((prev) => {
          const base = append ? (prev?.recommendations ?? []) : []
          resolveStartIdx = base.length
          return { valid: true, recommendations: [...base, ...currentRun] }
        })
        newRaws.forEach((raw, i) => {
          setTimeout(() => resolveOneProduct(resolveStartIdx + i, raw, setRecResponse), 0)
        })
      }
    }

    if (currentRun.length === 0 && outputText.trim()) {
      let rawList = []
      let parseSucceeded = false
      const toParse = stripJsonCodeFence(outputText)
      try {
        const parsed = JSON.parse(toParse)
        parseSucceeded = true
        const arr = Array.isArray(parsed) ? parsed : (parsed?.recommendations && Array.isArray(parsed.recommendations) ? parsed.recommendations : [])
        rawList = arr.filter((x) => x && typeof x === 'object' && x.product_name != null)
      } catch (_) {}
      if (rawList.length > 0) {
        setStreamStatus('Resolving products...')
        const wrapped = rawList.map((r) => wrapAsRecommendationItem(r, 'pending'))
        let resolveStartIdx = 0
        setRecResponse((prev) => {
          const base = append ? (prev?.recommendations ?? []) : []
          resolveStartIdx = base.length
          return { valid: true, recommendations: [...base, ...wrapped] }
        })
        rawList.forEach((raw, i) => {
          setTimeout(() => resolveOneProduct(resolveStartIdx + i, raw, setRecResponse), 0)
        })
      } else {
        // Parsed as empty/invalid items → "No results"; parse failed → show API text
        const message = parseSucceeded
          ? 'No results'
          : (() => {
              const apiMessage = outputText.trim()
              return apiMessage.length > 0 ? (apiMessage.length > 500 ? apiMessage.slice(0, 500) + '…' : apiMessage) : 'Could not get recommendations from stream.'
            })()
        setRecResponse({ valid: false, message })
      }
    } else if (currentRun.length === 0) {
      const apiMessage = outputText.trim()
      const message =
        apiMessage.length > 0
          ? (apiMessage.length > 500 ? apiMessage.slice(0, 500) + '…' : apiMessage)
          : responseId
            ? 'Could not get recommendations from stream.'
            : 'Stream ended without response id'
      setRecResponse({ valid: false, message })
    }

    await new Promise((r) => setTimeout(r, 800))
    setStreamStatus(null)
    setApiRequestState('resolved')
  }

  async function runSearch({ intent, recaptchaToken }) {
    const mode = STREAM_ENABLED ? 'streaming' : 'polling'
    const append = intent === 'more'
    const origin = typeof location !== 'undefined' ? location.origin : ''

    if (mode === 'streaming') {
      try {
        setStreamStatus('Opening the dumpster...')
        const body =
          intent === 'more'
            ? { previous_response_id: lastResponseId, recaptcha: recaptchaToken }
            : { query, recaptcha: recaptchaToken }
        const res = await fetch(`${origin}/api/stream-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          throw new Error(errBody?.error || res.statusText || 'Stream failed')
        }
        await consumeStreamAndResolve(res, append)
      } catch (err) {
        setStreamStatus(null)
        setApiRequestState('rejected')
        setRecResponse({ valid: false, message: err?.message || 'Streaming failed' })
      }
      return
    }

    // Polling mode
    if (intent === 'more') {
      try {
        const res = await fetch(`${origin}/api/more-options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ previous_response_id: lastResponseId, recaptcha: recaptchaToken })
        })
        const data = await res.json()
        if (!data?.response?.id) {
          setApiRequestState('rejected')
          setRecResponse({ valid: false, message: data?.message ?? 'No response from server' })
          return
        }
        setLastResponseId(data.response.id)
        await runPolling(data.response.id, { append: true })
      } catch (err) {
        setStreamStatus(null)
        setApiRequestState('rejected')
        setRecResponse({ valid: false, message: err?.message ?? 'Failed to get more options' })
      }
      return
    }

    try {
      const rawResponse = await fetch(
        `${origin}/api/assistant?query=${encodeURIComponent(query)}&recaptcha=${recaptchaToken}`,
        { method: 'POST' }
      )
      const responseJson = await rawResponse.json()
      if (responseJson?.response?.id == null) {
        setApiRequestState('rejected')
        setRecResponse({
          valid: false,
          message: responseJson?.message ?? 'No response ID returned from assistant'
        })
        return
      }
      setLastResponseId(responseJson.response.id)
      await runPolling(responseJson.response.id)
    } catch (err) {
      setStreamStatus(null)
      setApiRequestState('rejected')
      setRecResponse({ valid: false, message: err?.message ?? 'Request failed' })
    }
  }

  async function onSearch(event) {
    event.preventDefault()
    setRecResponse(null)
    setStreamStatus(null)
    setApiRequestState('pending')
    setLastResponseId(null)
    const recaptchaToken = await executeRecaptcha('search')
    sendGAEvent({ event: 'search', value: query })
    await runSearch({ intent: 'initial', recaptchaToken })
  }

  onSearchRef.current = onSearch

  async function onMoreOptions() {
    if (!lastResponseId) return
    const recaptchaToken = await executeRecaptcha('more_options')
    setApiRequestState('pending')
    await runSearch({ intent: 'more', recaptchaToken })
  }

  return (
    <main className="flex flex-col gap-8 sm:gap-10">
      {apiRequestState === 'pending' && !recResponse?.recommendations?.length ? (
        <Digging streamStatus={streamStatus} />
      ) : (
        <>
          {!recResponse?.recommendations?.length && (
            <section className="flex flex-col items-center gap-6 text-center">
              <PillSearchBar
                size="hero"
                value={query}
                onChange={onQueryUpdate}
                onSubmit={onSearch}
                placeholders={placeholders}
                autoFocus
              />
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-neutral-600">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggested.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setQuery(term)}
                      className="px-4 py-2 rounded-full text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
      {apiRequestState !== 'pending' && recResponse?.valid == false && ErrorResponseParser(recResponse)}
      {recResponse?.valid === true && recResponse.recommendations?.length > 0 && (
        <section className="flex flex-col gap-4">
          <em className="mb-1">Results are AI generated and may contain fabricated statements and broken links.</em>
          {recResponse.recommendations.length === 0 && ErrorResponseParser({ valid: true, message: 'No results' })}
          {recResponse.recommendations.map((product, index) => (
            <ProductCard product={product} key={index} />
          ))}
          {recResponse.recommendations.length > 0 && (
            <div className="flex flex-col items-center gap-4 pt-4">
              <button
                type="button"
                onClick={onMoreOptions}
                disabled={apiRequestState === 'pending' || !lastResponseId}
                className="btn btn-outline btn-primary"
              >
                Give me more options
              </button>
              {apiRequestState === 'pending' && <Digging streamStatus={streamStatus} />}
              <Footer />
            </div>
          )}
        </section>
      )}
    </main>
  )
}
