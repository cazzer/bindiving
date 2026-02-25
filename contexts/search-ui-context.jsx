'use client'

import { createContext, useContext, useState, useCallback } from 'react'

const SearchUIContext = createContext(null)

export function SearchUIProvider({ children }) {
  const [hasResults, setHasResults] = useState(false)
  const [searchProps, setSearchPropsState] = useState({
    query: '',
    onQueryUpdate: () => {},
    onSubmit: () => {},
    placeholder: 'Search again...'
  })

  const setSearchProps = useCallback((props) => {
    setSearchPropsState((prev) => ({ ...prev, ...props }))
  }, [])

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
