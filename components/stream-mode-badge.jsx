'use client'

import { useState, useEffect } from 'react'

const SEARCH_MODE_KEY = 'bindiving_search_mode'

function getSearchMode() {
  if (typeof window === 'undefined') return 'polling'
  const params = new URLSearchParams(window.location.search)
  if (params.get('stream') === '1') return 'streaming'
  if (params.get('stream') === '0') return 'polling'
  return localStorage.getItem(SEARCH_MODE_KEY) || 'polling'
}

export function StreamModeBadge() {
  const [mode, setMode] = useState('polling')

  useEffect(() => {
    setMode(getSearchMode())
  }, [])

  if (mode !== 'streaming') return null

  return (
    <div
      className="fixed top-4 right-4 z-50 rounded-full bg-blue-500/90 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur"
      aria-hidden
    >
      Streaming
    </div>
  )
}
