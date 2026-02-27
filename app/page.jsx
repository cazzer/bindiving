'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import * as Sentry from '@sentry/nextjs'
import { sendGAEvent } from '@next/third-parties/google'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import posthog from 'posthog-js'

import ProductCard from '../components/product-card'
import PillSearchBar from '../components/pill-search-bar'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'
import { Footer } from 'components/footer'
import { useSearchUI } from '../contexts/search-ui-context'
import { isValidSourceUrl } from '../lib/utils'
import { STREAM_ENABLED } from '../config'
import {
  parsePartialRecommendations,
  parseFinalRecommendations,
  streamEventToMessage
} from './lib/stream-recommendations'

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

// Seeded shuffle so order is random but deterministic (same on SSR and client = no flash). Seed by UTC minute so refreshes after a minute get new order.
function seededShuffle(arr, seed) {
  const out = [...arr]
  let s = seed
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const MINUTE_SEED = typeof Date !== 'undefined' ? Math.floor(Date.now() / 60000) : 0
const PLACEHOLDERS = seededShuffle(PLACEHOLDER_LIST, MINUTE_SEED)
const SUGGESTED = PLACEHOLDERS.slice(0, 4)

const POLL_INTERVAL_MS = 3000

const POLL_STATUS_MESSAGES = ['Checking the bin...', 'Still digging...', 'Almost there...']

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

function nextRecId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `rec-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function wrapAsRecommendationItem(raw, status = 'pending') {
  return {
    ...raw,
    _id: nextRecId(),
    pros: Array.isArray(raw.pros) ? raw.pros : [],
    cons: Array.isArray(raw.cons) ? raw.cons : [],
    sources: Array.isArray(raw.sources) ? raw.sources.map(normalizeSource).filter((s) => s.link && isValidSourceUrl(s.link)) : [],
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

  const placeholders = PLACEHOLDERS
  const suggested = SUGGESTED

  const hasResults = Boolean(recResponse?.recommendations?.length)
  useEffect(() => {
    const id = requestAnimationFrame(() => setHasResults(hasResults))
    return () => cancelAnimationFrame(id)
  }, [hasResults, setHasResults])

  const onQueryUpdate = useCallback((event) => {
    const v = event.target.value
    setQuery(v)
    setSearchProps({ query: v })
  }, [setSearchProps])

  const onSearchRef = useRef(() => {})
  const lastAwwShucksSignatureRef = useRef(null)

  useEffect(() => {
    if (apiRequestState === 'pending') return
    if (recResponse?.valid !== false) return

    const message = typeof recResponse?.message === 'string' ? recResponse.message : 'unknown_error'
    const signature = `${message}::${lastResponseId || 'no_response_id'}::${query || 'no_query'}`
    if (lastAwwShucksSignatureRef.current === signature) return
    lastAwwShucksSignatureRef.current = signature

    Sentry.withScope((scope) => {
      scope.setLevel('error')
      scope.setTag('ui_state', 'aww_shucks')
      scope.setTag('error_surface', 'search_results')
      scope.setContext('aww_shucks', {
        apiRequestState,
        message,
        query,
        hasResponseId: Boolean(lastResponseId)
      })
      Sentry.captureException(new Error(`Aww Shucks screen shown: ${message}`))
    })
  }, [apiRequestState, lastResponseId, query, recResponse])
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setSearchProps({
        query,
        onQueryUpdate,
        onSubmit: (e) => onSearchRef.current(e),
        placeholder: 'Search again...'
      })
    })
    return () => cancelAnimationFrame(id)
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

  async function resolveOneProduct(recId, rawProduct, setRecResponse) {
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
        const idx = recs.findIndex((r) => r._id === recId)
        if (idx === -1) return prev
        recs[idx] = {
          ...recs[idx],
          _resolveStatus: data.valid ? 'resolved' : 'error',
          _resolved: data.valid ? data.product : undefined,
          _error: data.valid ? undefined : (data.message || "Couldn't load link")
        }
        return { ...prev, valid: true, recommendations: recs }
      })
    } catch (_) {
      setRecResponse((prev) => {
        const recs = [...(prev?.recommendations ?? [])]
        const idx = recs.findIndex((r) => r._id === recId)
        if (idx === -1) return prev
        recs[idx] = { ...recs[idx], _resolveStatus: 'error', _error: "Couldn't load link" }
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
      sendGAEvent({ event: 'search_results', value: rawList.length })
      posthog.capture('search_results_received', {
        result_count: rawList.length,
        mode: 'polling',
        append,
        response_id: responseId,
      })
      const wrapped = rawList.map((r) => wrapAsRecommendationItem(r, 'pending'))
      setRecResponse((prev) => {
        const base = append ? (prev?.recommendations ?? []) : []
        return { valid: true, recommendations: [...base, ...wrapped] }
      })
      wrapped.forEach((w, i) => {
        setTimeout(() => resolveOneProduct(w._id, rawList[i], setRecResponse), 0)
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
                setStreamStatus('Mapping the dumpster…')
              } else if (!msg) {
                setStreamStatus('Tossing out suggestions...')
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
          setStreamStatus(`Pulled out: ${newRaws[0].product_name}`)
        }
        const newWrapped = newRaws.map((raw) => wrapAsRecommendationItem(raw, 'pending'))
        newWrapped.forEach((w) => currentRun.push(w))
        setRecResponse((prev) => {
          const base = append ? (prev?.recommendations ?? []) : []
          return { valid: true, recommendations: [...base, ...currentRun] }
        })
        newWrapped.forEach((w, i) => {
          setTimeout(() => resolveOneProduct(w._id, newRaws[i], setRecResponse), 0)
        })
      }
    }

    if (currentRun.length === 0 && outputText.trim()) {
      const { list: rawList, parseSucceeded } = parseFinalRecommendations(outputText)
      const listToUse = rawList.length > 0 ? rawList : parsePartialRecommendations(outputText)
      if (listToUse.length > 0) {
        setStreamStatus('Checking the finds...')
        sendGAEvent({ event: 'search_results', value: listToUse.length })
        posthog.capture('search_results_received', {
          result_count: listToUse.length,
          mode: 'streaming',
          append,
          response_id: responseId,
        })
        const wrapped = listToUse.map((r) => wrapAsRecommendationItem(r, 'pending'))
        setRecResponse((prev) => {
          const base = append ? (prev?.recommendations ?? []) : []
          return { valid: true, recommendations: [...base, ...wrapped] }
        })
        wrapped.forEach((w, i) => {
          setTimeout(() => resolveOneProduct(w._id, listToUse[i], setRecResponse), 0)
        })
      } else {
        const apiMessage = outputText.trim()
        const message = parseSucceeded
          ? 'No results'
          : apiMessage.length > 0
            ? (apiMessage.length > 500 ? apiMessage.slice(0, 500) + '…' : apiMessage)
            : 'Could not get recommendations from stream.'
        if (!parseSucceeded) {
          Sentry.withScope((scope) => {
            scope.setLevel('error')
            scope.setTag('error_kind', 'parse_failure')
            scope.setTag('source', 'stream_output')
            scope.setContext('parse_failure', {
              outputLength: outputText.length,
              outputPreview: apiMessage.slice(0, 500),
              responseId: responseId || null,
              append,
              query
            })
            Sentry.captureException(new Error('Failed to parse streamed recommendations'))
          })
        }
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
    if (currentRun.length > 0) {
      sendGAEvent({ event: 'search_results', value: currentRun.length })
      posthog.capture('search_results_received', {
        result_count: currentRun.length,
        mode: 'streaming',
        append,
        response_id: responseId,
      })
    }

    await new Promise((r) => setTimeout(r, 800))
    setStreamStatus(null)
    setApiRequestState('resolved')
  }

  async function runSearch({ intent, recaptchaToken, query: queryOverride }) {
    const mode = STREAM_ENABLED ? 'streaming' : 'polling'
    const append = intent === 'more'
    const searchQuery = queryOverride !== undefined ? queryOverride : query
    const origin = typeof location !== 'undefined' ? location.origin : ''

    if (mode === 'streaming') {
      try {
        setStreamStatus('Opening the dumpster...')
        const body =
          intent === 'more'
            ? { previous_response_id: lastResponseId, recaptcha: recaptchaToken }
            : { query: searchQuery, recaptcha: recaptchaToken }
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
        posthog.capture('search_error', {
          error_message: err?.message || 'Streaming failed',
          mode: 'streaming',
          query: searchQuery,
        })
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
        posthog.capture('search_error', {
          error_message: err?.message ?? 'Failed to get more options',
          mode: 'polling',
          intent: 'more',
        })
      }
      return
    }

    try {
      const rawResponse = await fetch(
        `${origin}/api/assistant?query=${encodeURIComponent(searchQuery)}&recaptcha=${recaptchaToken}`,
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
      posthog.capture('search_error', {
        error_message: err?.message ?? 'Request failed',
        mode: 'polling',
        intent: 'initial',
        query: searchQuery,
      })
    }
  }

  async function onSearch(event, queryOverride) {
    event?.preventDefault?.()
    setRecResponse(null)
    setStreamStatus(null)
    setApiRequestState('pending')
    setLastResponseId(null)
    const recaptchaToken = await executeRecaptcha('search')
    const q = queryOverride !== undefined ? queryOverride : query
    setQuery(q)
    sendGAEvent({ event: 'search', value: q })
    posthog.capture('search_submitted', {
      query: q,
      is_suggested: queryOverride !== undefined,
    })
    await runSearch({ intent: 'initial', recaptchaToken, query: q })
  }

  onSearchRef.current = onSearch

  async function onMoreOptions() {
    if (!lastResponseId) return
    const currentCount = recResponse?.recommendations?.length ?? 0
    sendGAEvent({ event: 'more_options', value: currentCount })
    posthog.capture('more_options_requested', {
      existing_result_count: currentCount,
      response_id: lastResponseId,
    })
    const recaptchaToken = await executeRecaptcha('more_options')
    setApiRequestState('pending')
    await runSearch({ intent: 'more', recaptchaToken })
  }

  return (
    <main className="mt-6 sm:mt-8 flex flex-col gap-8 sm:gap-10">
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
                <p className="text-sm text-base-content/70 font-display">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggested.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        posthog.capture('suggested_search_clicked', { term })
                        onSearchRef.current?.({ preventDefault: () => {} }, term)
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium border-2 border-[var(--retro-border)] bg-base-100 hover:bg-base-200 transition-colors font-display"
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
          <em className="mb-1 block text-center">Results are AI generated and may contain fabricated statements and broken links.</em>
          {recResponse.recommendations.length === 0 && ErrorResponseParser({ valid: true, message: 'No results' })}
          {recResponse.recommendations.map((product) => (
            <ProductCard product={product} key={product._id} />
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
