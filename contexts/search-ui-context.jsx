'use client'

import { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'

const SearchUIContext = createContext(null)

const NOOP = () => {}

export function SearchUIProvider({ children }) {
  const [hasResults, setHasResults] = useState(false)
  const [queryPlaceholder, setQueryPlaceholder] = useState({
    query: '',
    placeholder: 'Search again...'
  })
  const callbacksRef = useRef({ onQueryUpdate: NOOP, onSubmit: NOOP })

  const setSearchProps = useCallback((props) => {
    if (props.onQueryUpdate != null) callbacksRef.current.onQueryUpdate = props.onQueryUpdate
    if (props.onSubmit != null) callbacksRef.current.onSubmit = props.onSubmit
    setQueryPlaceholder((prev) => {
      const query = props.query !== undefined ? props.query : prev.query
      const placeholder = props.placeholder !== undefined ? props.placeholder : prev.placeholder
      if (prev.query === query && prev.placeholder === placeholder) return prev
      return { query, placeholder }
    })
  }, [])

  const searchProps = useMemo(
    () => ({
      ...queryPlaceholder,
      get onQueryUpdate() {
        return callbacksRef.current.onQueryUpdate
      },
      get onSubmit() {
        return callbacksRef.current.onSubmit
      }
    }),
    [queryPlaceholder]
  )

  return (
    <SearchUIContext.Provider value={{ hasResults, setHasResults, searchProps, setSearchProps }}>
      {children}
    </SearchUIContext.Provider>
  )
}

export function useSearchUI() {
  const ctx = useContext(SearchUIContext)
  if (!ctx) throw new Error('useSearchUI must be used within SearchUIProvider')
  return ctx
}
