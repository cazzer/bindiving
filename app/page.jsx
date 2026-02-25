'use client'

import { useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

import ProductCard from '../components/product-card'
import PillSearchBar from '../components/pill-search-bar'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'
import { Footer } from 'components/footer'

const PLACEHOLDERS = [
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
].sort((a, b) => 0.5 - Math.random())

const SUGGESTED = PLACEHOLDERS.slice(0, 4)

const POLL_INTERVAL_MS = 3000
const SEARCH_MODE_KEY = 'bindiving_search_mode'

function getSearchMode() {
  if (typeof window === 'undefined') return 'polling'
  const params = new URLSearchParams(window.location.search)
  if (params.get('stream') === '1') return 'streaming'
  if (params.get('stream') === '0') return 'polling'
  return localStorage.getItem(SEARCH_MODE_KEY) || 'polling'
}

// Map OpenAI stream event types to short UI messages
function streamEventToMessage(type) {
  if (!type || typeof type !== 'string') return null
  if (type === 'keepalive') return 'Waiting for response...'
  if (type.includes('web_search_call')) {
    if (type.includes('searching')) return 'Searching the web...'
    if (type.includes('completed')) return 'Found sources.'
  }
  if (type === 'response.output_text.delta') return 'Writing recommendations...'
  if (type === 'response.completed') return 'Almost there...'
  if (type === 'response.created' || type === 'response.in_progress') return 'Starting...'
  return null
}

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)
  const [lastResponseId, setLastResponseId] = useState(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  async function runPolling(responseId, { append = false } = {}) {
    const url = `${location.origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}`
    for (;;) {
      const res = await fetch(url, { method: 'GET' })
      const data = await res.json()
      if (data.status === 'pending' || res.status === 202) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        continue
      }
      setApiRequestState('resolved')
      if (append && data.valid && data.recommendations?.length) {
        setRecResponse((prev) => ({
          ...data,
          recommendations: [...(prev?.recommendations ?? []), ...data.recommendations]
        }))
      } else {
        setRecResponse(data)
      }
      return
    }
  }

  async function onMoreOptions() {
    if (!lastResponseId) return
    const recaptchaToken = await executeRecaptcha('more_options')
    setApiRequestState('pending')
    try {
      const res = await fetch(`${location.origin}/api/more-options`, {
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
      setApiRequestState('rejected')
      setRecResponse({ valid: false, message: err?.message ?? 'Failed to get more options' })
    }
  }

  async function runStreaming(recaptchaToken) {
    const streamUrl = `${location.origin}/api/stream-search`
    try {
      setStreamStatus('Connecting to stream...')
      const res = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, recaptcha: recaptchaToken })
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody?.error || res.statusText || 'Stream failed')
      }
      if (!res.body) throw new Error('No response body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let responseId = null
      let outputText = ''
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
              const msg = streamEventToMessage(event?.type)
              if (msg) setStreamStatus(msg)
              if (event?.type === 'response.output_text.delta' && typeof event?.delta === 'string') {
                outputText += event.delta
              }
              if (event?.type === 'response.completed' || event?.type === 'response.created') {
                const id = event?.response?.id ?? event?.id
                if (id) {
                  responseId = id
                  setLastResponseId(id)
                }
              }
            } catch (_) {
              // ignore parse errors for non-JSON lines
            }
          }
        }
      }
      setStreamStatus('Resolving products...')
      let data
      let recommendations = null
      try {
        if (outputText.trim()) recommendations = JSON.parse(outputText.trim())
      } catch (_) {}
      if (Array.isArray(recommendations) && recommendations.length > 0) {
        const resolveRes = await fetch(`${location.origin}/api/resolve-products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendations })
        })
        data = await resolveRes.json()
      } else {
        if (!responseId) {
          setStreamStatus(null)
          setApiRequestState('rejected')
          setRecResponse({ valid: false, message: 'Stream ended without response id' })
          return
        }
        const final = await fetch(`${location.origin}/api/read-thread?response-id=${encodeURIComponent(responseId)}`, {
          method: 'GET'
        })
        data = await final.json()
      }
      setStreamStatus(null)
      setApiRequestState('resolved')
      setRecResponse(data)
    } catch (err) {
      setStreamStatus(null)
      setApiRequestState('rejected')
      setRecResponse({ valid: false, message: err?.message || 'Streaming failed' })
    }
  }

  async function onSearch(event) {
    event.preventDefault()
    const recaptchaToken = await executeRecaptcha('search')
    sendGAEvent({ event: 'search', value: query })

    setStreamStatus(null)
    setApiRequestState('pending')
    setLastResponseId(null)
    const mode = getSearchMode()

    if (mode === 'streaming') {
      await runStreaming(recaptchaToken)
      return
    }

    const rawResponse = await fetch(
      `${location.origin}/api/assistant?query=${encodeURIComponent(query)}&recaptcha=${recaptchaToken}`,
      { method: 'POST' }
    )

    let responseJson
    try {
      responseJson = await rawResponse.json()
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({ valid: false, message: error.message })
      return
    }

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
                placeholders={PLACEHOLDERS}
                autoFocus
              />
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-neutral-600">Try searching for:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED.map((term) => (
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
          {recResponse?.recommendations?.length > 0 && (
            <PillSearchBar
              size="compact"
              value={query}
              onChange={onQueryUpdate}
              onSubmit={onSearch}
              placeholder="Search again..."
            />
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
