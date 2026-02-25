'use client'

import Image from 'next/image'
import Link from 'next/link'

import { useSearchUI } from '../contexts/search-ui-context'
import PillSearchBar from './pill-search-bar'
import logo from 'public/images/bin-diving.svg'

const TAGLINE =
  "There's a lot of rubbish on the internet. Describe what you're looking for and we'll use some AI magic to find a few recommendations."

export function Header() {
  const { hasResults, searchProps } = useSearchUI()

  return (
    <header
      className={`flex items-center transition-all duration-300 ease-in ${
        hasResults ? 'flex-row py-4' : 'flex-col pt-12 pb-8 sm:pt-16 sm:pb-12'
      }`}
    >
      <Link
        href="/"
        className={`flex items-center gap-2 shrink-0 transition-all duration-300 ease-in ${
          hasResults ? 'flex-row' : 'flex-col items-center gap-4 text-center'
        }`}
      >
        <Image
          src={logo}
          alt="Bin Diving"
          width={hasResults ? 32 : 56}
          height={hasResults ? 32 : 56}
          className="transition-all duration-300 ease-in"
        />
        <h1
          className={`font-bold tracking-tight text-neutral-900 transition-all duration-300 ease-in m-0 ${
            hasResults ? 'text-xl' : 'text-3xl sm:text-4xl'
          }`}
        >
          Bin Diving
        </h1>
      </Link>

      {hasResults && (
        <div className="flex-1 flex justify-center min-w-0 px-4 animate-search-in">
          <PillSearchBar
            size="compact"
            value={searchProps.query}
            onChange={searchProps.onQueryUpdate}
            onSubmit={searchProps.onSubmit}
            placeholder={searchProps.placeholder}
          />
        </div>
      )}

      {!hasResults && (
        <p className="mt-4 max-w-xl text-sm text-neutral-600 sm:text-base text-center animate-fade-in">
          {TAGLINE}
        </p>
      )}
    </header>
  )
}
