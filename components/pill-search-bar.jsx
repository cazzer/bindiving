'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

const SearchIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const sizes = {
  hero: {
    form: 'w-full max-w-2xl mx-auto',
    wrapper: 'shadow-lg',
    iconLeft: 'left-5',
    iconSize: 'w-5 h-5',
    input: 'py-4 pl-12 pr-4 text-base',
    button: 'px-8 py-4 text-base'
  },
  compact: {
    form: 'w-full max-w-2xl mx-auto',
    wrapper: 'shadow-sm',
    iconLeft: 'left-4',
    iconSize: 'w-5 h-5',
    input: 'py-3 pl-11 pr-4 text-sm',
    button: 'px-6 py-3 text-sm'
  }
}

export default function PillSearchBar({
  size = 'hero',
  value,
  onChange,
  onSubmit,
  placeholder: placeholderProp = 'Search again...',
  placeholders,
  formClassName,
  autoFocus = false
}) {
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('')
  const indexRef = useRef(0)
  const isHero = size === 'hero'
  const s = sizes[size] || sizes.hero

  useEffect(() => {
    if (!placeholders?.length) return
    const interval = setInterval(() => {
      const i = indexRef.current
      const current = placeholders[i]
      setAnimatedPlaceholder((prev) => {
        if (prev.length >= current.length + 30) {
          indexRef.current = i < placeholders.length - 1 ? i + 1 : 0
          return ''
        }
        if (prev.length >= current.length) return prev + ' '
        return current.slice(0, prev.length + 1)
      })
    }, 65)
    return () => clearInterval(interval)
  }, [placeholders])

  const placeholder = isHero && placeholders?.length ? animatedPlaceholder || 'Search for anything...' : placeholderProp

  return (
    <form onSubmit={onSubmit} className={cn(s.form, formClassName)}>
      <div
        className={cn(
          'flex rounded-full bg-white border border-neutral-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500',
          s.wrapper
        )}
      >
        <div className="relative flex-1 flex items-center">
          <span className={cn('absolute pointer-events-none text-neutral-400', s.iconLeft)} aria-hidden>
            <SearchIcon className={s.iconSize} />
          </span>
          <input
            type="text"
            autoFocus={autoFocus}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={cn(
              'w-full border-0 rounded-l-full bg-transparent text-neutral-900 placeholder:text-neutral-400 focus:ring-0 focus:outline-none',
              s.input
            )}
          />
        </div>
        <button
          type="submit"
          className={cn(
            'shrink-0 rounded-r-full bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors',
            s.button
          )}
        >
          Search
        </button>
      </div>
    </form>
  )
}
