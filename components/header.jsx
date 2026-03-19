'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { useSearchUI } from '../contexts/recommendations-context'
import { ThemeSwitcher } from './theme-switcher'
import PillSearchBar from './pill-search-bar'
import logo from 'public/images/bin-diving.svg'

const TAGLINE =
  "There's a lot of rubbish on the internet. Describe what you're looking for and we'll show you the top recommendations from across the web."

export function Header() {
  const pathname = usePathname()
  const { hasResults, searchProps } = useSearchUI()
  const showHeaderSearchBar = hasResults && !pathname?.startsWith('/results')

  return (
    <header
      className={`flex items-center transition-all duration-300 ease-in border-b-2 border-[var(--retro-border)] ${
        showHeaderSearchBar ? 'flex-row py-4' : 'flex-col pt-12 pb-8 sm:pt-16 sm:pb-12'
      }`}
    >
      {showHeaderSearchBar ? (
        <>
          <Link href="/" className="flex items-center gap-2 shrink-0 transition-all duration-300 ease-in flex-row">
            <Image
              src={logo}
              alt="Bin Diving"
              width={32}
              height={32}
              className="site-logo transition-all duration-300 ease-in"
            />
            <h1 className="hidden md:block font-display font-bold tracking-tight text-base-content transition-all duration-300 ease-in m-0 text-xl">
              Bin Diving
            </h1>
          </Link>
          <div className="flex-1 flex justify-center min-w-0 px-4 animate-search-in">
            <PillSearchBar
              size="compact"
              value={searchProps.query}
              onChange={searchProps.onQueryUpdate}
              onSubmit={searchProps.onSubmit}
              placeholder={searchProps.placeholder}
            />
          </div>
          <ThemeSwitcher className="shrink-0" />
        </>
      ) : (
        <>
          <div className="flex justify-between items-start w-full">
            <div className="flex-1" />
            <Link href="/" className="flex flex-row items-center gap-3 text-center shrink-0">
              <Image
                src={logo}
                alt="Bin Diving"
                width={56}
                height={56}
                className="site-logo transition-all duration-300 ease-in"
              />
              <h1 className="font-display font-bold tracking-tight text-base-content text-3xl sm:text-4xl m-0">
                Bin Diving
              </h1>
            </Link>
            <ThemeSwitcher className="shrink-0 flex-1 justify-end" />
          </div>
          <p className="mt-4 max-w-xl text-sm text-base-content/70 sm:text-base text-center animate-fade-in font-display">
            {TAGLINE}
          </p>
        </>
      )}
    </header>
  )
}
