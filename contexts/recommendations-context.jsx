'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import * as Sentry from '@sentry/nextjs'
import { sendGAEvent } from '@next/third-parties/google'
import posthog from 'posthog-js'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

import * as recommendationsService from '../lib/services/recommendations-service'
import { isValidSourceUrl } from '../lib/utils'

const RecommendationsContext = createContext(null)

// Helper functions
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

function wrapAsRecommendationItem(raw) {
  // Normalize, filter invalid, and deduplicate sources by link
  const sources = Array.isArray(raw.sources) 
    ? raw.sources
        .map(normalizeSource)
        .filter((s) => s.link && isValidSourceUrl(s.link))
        .filter((source, index, arr) => 
          // Keep only first occurrence of each unique link
          arr.findIndex(s => s.link === source.link) === index
        )
    : []
  
  return {
    ...raw,
    _id: nextRecId(),
    pros: Array.isArray(raw.pros) ? raw.pros : [],
    cons: Array.isArray(raw.cons) ? raw.cons : [],
    sources,
    _resolveStatus: 'pending',
    _resolved: undefined,
    _error: undefined
  }
}

export function RecommendationsProvider({ children }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle') // idle | searching | success | error
  const [recommendations, setRecommendations] = useState([])
  const [error, setError] = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)
  const [responseId, setResponseId] = useState(null)
  
  const { executeRecaptcha } = useGoogleReCaptcha()
  
  // For Header integration (replaces SearchUIContext)
  const [searchProps, setSearchPropsState] = useState({
    query: '',
    placeholder: 'Search again...'
  })
  const callbacksRef = useRef({ onQueryUpdate: () => {}, onSubmit: () => {} })

  const hasResults = recommendations.length > 0

  // Update query (for input onChange)
  const updateQuery = useCallback((event) => {
    const v = event.target.value
    setQuery(v)
    setSearchPropsState(prev => ({ ...prev, query: v }))
  }, [])

  // Resolve a single product
  const resolveProduct = useCallback(async (recId, rawProduct) => {
    const result = await recommendationsService.resolveProduct(rawProduct)
    
    setRecommendations(prev => {
      const updated = [...prev]
      const idx = updated.findIndex(r => r._id === recId)
      if (idx === -1) return prev
      
      if (result.status === 'success') {
        updated[idx] = {
          ...updated[idx],
          _resolveStatus: 'resolved',
          _resolved: result.data,
          _error: undefined
        }
      } else {
        updated[idx] = {
          ...updated[idx],
          _resolveStatus: 'error',
          _error: result.error.message
        }
      }
      
      return updated
    })
  }, [])

  // Main search function
  const search = useCallback(async (searchQuery, isSuggested = false) => {
    if (!executeRecaptcha) {
      console.error('reCAPTCHA not ready')
      return
    }

    setStatus('searching')
    setError(null)
    setRecommendations([])
    setStreamStatus(null)
    setResponseId(null)
    
    const recaptchaToken = await executeRecaptcha('search')
    
    // Analytics
    sendGAEvent({ event: 'search', value: searchQuery })
    posthog.capture('search_submitted', {
      query: searchQuery,
      is_suggested: isSuggested
    })

    const result = await recommendationsService.searchRecommendations({
      query: searchQuery,
      recaptchaToken,
      onStatusUpdate: setStreamStatus
    })

    setStreamStatus(null)

    if (result.status === 'error') {
      setStatus('error')
      setError(result.error)
      
      // Track error in Sentry
      Sentry.withScope((scope) => {
        scope.setLevel('error')
        scope.setTag('error_surface', 'search_results')
        scope.setTag('mode', result.metadata?.mode || 'unknown')
        scope.setContext('search_error', {
          message: result.error.message,
          query: searchQuery,
          metadata: result.metadata
        })
        
        if (result.error.parseFailure) {
          scope.setTag('error_kind', 'parse_failure')
          scope.setContext('parse_failure', {
            outputLength: result.error.outputLength,
            outputPreview: result.error.outputPreview
          })
          Sentry.captureException(new Error('Failed to parse recommendations'))
        } else {
          Sentry.captureException(
            result.error.originalError || new Error(result.error.message)
          )
        }
      })

      posthog.capture('search_error', {
        error_message: result.error.message,
        mode: result.metadata?.mode,
        query: searchQuery
      })
      
      return
    }

    // Success - set response ID and wrap recommendations
    if (result.metadata?.responseId) {
      setResponseId(result.metadata.responseId)
    }

    const wrapped = result.data.map(wrapAsRecommendationItem)
    setRecommendations(wrapped)
    setStatus('success')

    // Analytics
    sendGAEvent({ event: 'search_results', value: result.data.length })
    posthog.capture('search_results_received', {
      result_count: result.data.length,
      mode: result.metadata?.mode,
      append: false,
      response_id: result.metadata?.responseId
    })

    // Resolve products individually
    wrapped.forEach((rec, idx) => {
      setTimeout(() => resolveProduct(rec._id, result.data[idx]), 0)
    })
  }, [executeRecaptcha, resolveProduct])

  // Get more options
  const getMoreOptions = useCallback(async () => {
    if (!responseId || !executeRecaptcha) return

    const currentCount = recommendations.length
    
    setStatus('searching')
    setStreamStatus(null)
    
    const recaptchaToken = await executeRecaptcha('more_options')

    // Analytics
    sendGAEvent({ event: 'more_options', value: currentCount })
    posthog.capture('more_options_requested', {
      existing_result_count: currentCount,
      response_id: responseId
    })

    const result = await recommendationsService.getMoreOptions({
      responseId,
      recaptchaToken,
      onStatusUpdate: setStreamStatus
    })

    setStreamStatus(null)

    if (result.status === 'error') {
      setStatus('error')
      setError(result.error)
      
      Sentry.withScope((scope) => {
        scope.setLevel('error')
        scope.setTag('error_surface', 'more_options')
        scope.setContext('more_options_error', {
          message: result.error.message,
          metadata: result.metadata
        })
        Sentry.captureException(
          result.error.originalError || new Error(result.error.message)
        )
      })

      posthog.capture('search_error', {
        error_message: result.error.message,
        mode: result.metadata?.mode,
        intent: 'more'
      })
      
      return
    }

    // Append new recommendations
    const wrapped = result.data.map(wrapAsRecommendationItem)
    setRecommendations(prev => [...prev, ...wrapped])
    setStatus('success')

    // Analytics
    sendGAEvent({ event: 'search_results', value: result.data.length })
    posthog.capture('search_results_received', {
      result_count: result.data.length,
      mode: result.metadata?.mode,
      append: true,
      response_id: result.metadata?.responseId
    })

    // Resolve new products
    wrapped.forEach((rec, idx) => {
      setTimeout(() => resolveProduct(rec._id, result.data[idx]), 0)
    })
  }, [responseId, recommendations.length, executeRecaptcha, resolveProduct])

  // Share: persist result to Blobs and return slug for /results/{slug}
  const saveResultForShare = useCallback(async () => {
    const resolved = recommendations
      .filter((r) => r._resolveStatus === 'resolved' && r._resolved)
      .map((r) => r._resolved)
    if (!query?.trim() || resolved.length === 0) {
      return { error: 'No results to share' }
    }
    try {
      const res = await fetch('/api/save-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), recommendations: resolved, resolvedLinks: {} })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) return { error: data?.error || res.statusText || 'Failed to save' }
      return { slug: data.slug }
    } catch (err) {
      return { error: err?.message || 'Failed to save' }
    }
  }, [query, recommendations])

  // Set search props (for header integration)
  const setSearchProps = useCallback((props) => {
    if (props.onQueryUpdate != null) callbacksRef.current.onQueryUpdate = props.onQueryUpdate
    if (props.onSubmit != null) callbacksRef.current.onSubmit = props.onSubmit
    setSearchPropsState(prev => {
      const newQuery = props.query !== undefined ? props.query : prev.query
      const placeholder = props.placeholder !== undefined ? props.placeholder : prev.placeholder
      if (prev.query === newQuery && prev.placeholder === placeholder) return prev
      return { query: newQuery, placeholder }
    })
  }, [])

  const searchPropsWithCallbacks = useMemo(
    () => ({
      ...searchProps,
      get onQueryUpdate() {
        return callbacksRef.current.onQueryUpdate
      },
      get onSubmit() {
        return callbacksRef.current.onSubmit
      }
    }),
    [searchProps]
  )

  const value = {
    // State
    query,
    status,
    recommendations,
    error,
    streamStatus,
    hasResults,
    
    // Actions
    search,
    getMoreOptions,
    updateQuery,
    setQuery,
    saveResultForShare,

    // For Header (SearchUI compatibility)
    searchProps: searchPropsWithCallbacks,
    setSearchProps,
    setHasResults: () => {} // No-op for compatibility
  }

  return (
    <RecommendationsContext.Provider value={value}>
      {children}
    </RecommendationsContext.Provider>
  )
}

export function useRecommendations() {
  const ctx = useContext(RecommendationsContext)
  if (!ctx) {
    throw new Error('useRecommendations must be used within RecommendationsProvider')
  }
  return ctx
}

// Alias for backward compatibility with Header
export const useSearchUI = useRecommendations
