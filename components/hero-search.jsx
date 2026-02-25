'use client'

import { useEffect, useState } from 'react'

function SearchIcon({ className = '' }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

export default function HeroSearch({ value, onChange, onSubmit, placeholders }) {
  const [placeholderValue, setPlaceholderValue] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      if (placeholderValue.length >= placeholders[placeholderIndex].length + 30) {
        setPlaceholderIndex(placeholderIndex < placeholders.length - 1 ? placeholderIndex + 1 : 0)
        setPlaceholderValue('')
      } else if (placeholderValue.length >= placeholders[placeholderIndex].length) {
        setPlaceholderValue(placeholderValue + ' ')
      } else {
        setPlaceholderValue(placeholders[placeholderIndex].substring(0, placeholderValue.length + 1))
      }
    }, 45)
    return () => clearInterval(interval)
  })

  return (
    <form onSubmit={onSubmit} className="w-full max-w-2xl mx-auto">
      <div className="flex rounded-full bg-white border border-neutral-200 shadow-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
        <div className="relative flex-1 flex items-center">
          <span className="absolute left-5 pointer-events-none text-neutral-400" aria-hidden>
            <SearchIcon className="w-5 h-5" />
          </span>
          <input
            type="text"
            autoFocus
            value={value}
            onChange={onChange}
            placeholder={placeholderValue || 'Search for anything...'}
            className="w-full py-4 pl-12 pr-4 text-neutral-900 placeholder:text-neutral-400 border-0 rounded-l-full bg-transparent focus:ring-0 focus:outline-none text-base"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 px-8 py-4 rounded-r-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-base transition-colors"
        >
          Search
        </button>
      </div>
    </form>
  )
}
