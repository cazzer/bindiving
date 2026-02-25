'use client'

import { useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

import ProductCard from '../components/product-card'
import HeroSearch from '../components/hero-search'
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
  `helium-filled dumbbells`
].sort((a, b) => 0.5 - Math.random())

const SUGGESTED = [
  'blister-proof running socks',
  'hotel-quality pillows',
  'extra durable plunger',
  'dark lightbulbs'
]

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  async function onSearch(event) {
    event.preventDefault()
    const recaptchaToken = await executeRecaptcha('search')
    sendGAEvent({ event: 'search', value: query })

    setApiRequestState('pending')
    // initiate thread
    const rawResponse = await fetch(`${location.origin}/api/assistant?query=${query}&recaptcha=${recaptchaToken}`, {
      method: 'POST'
    })

    let responseJson
    try {
      responseJson = await rawResponse.json()
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: error.message
      })

      return
    }

    if (responseJson?.response.id == null) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: 'No response ID returned from assistant'
      })

      return
    }

    await sleep(60000)

    // retrieve messages
    const messageResponse = await fetch(`${location.origin}/api/read-thread?response-id=${responseJson.response.id}`, {
      method: 'POST'
    })

    try {
      const messageResult = await messageResponse.json()
      setApiRequestState('resolved')
      setRecResponse(messageResult)
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: error.message
      })
    }
  }

  return (
    <main className="flex flex-col gap-8 sm:gap-10">
      {apiRequestState !== 'pending' ? (
        <>
          {!recResponse?.recommendations?.length && (
            <section className="flex flex-col items-center gap-6 text-center">
              <HeroSearch
                value={query}
                onChange={onQueryUpdate}
                onSubmit={onSearch}
                placeholders={PLACEHOLDERS}
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
            <form className="text-base-content max-w-2xl mx-auto w-full" onSubmit={onSearch}>
              <div className="flex rounded-full bg-white border border-neutral-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                <div className="relative flex-1 flex items-center">
                  <span className="absolute left-4 text-neutral-400 pointer-events-none" aria-hidden>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={query}
                    onChange={onQueryUpdate}
                    placeholder="Search again..."
                    className="w-full py-3 pl-11 pr-4 border-0 rounded-l-full bg-transparent focus:ring-0 text-neutral-900 placeholder:text-neutral-400 text-sm"
                  />
                </div>
                <button type="submit" className="shrink-0 px-6 py-3 rounded-r-full bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium">
                  Search
                </button>
              </div>
            </form>
          )}
        </>
      ) : (
        <Digging />
      )}
      {apiRequestState !== 'pending' && recResponse?.valid == false && ErrorResponseParser(recResponse)}
      {apiRequestState !== 'pending' && recResponse?.valid == true && (
        <section className="flex flex-col gap-4">
          <em className="mb-1">
            Notice and disclaimer: I earn commission if you use these links to make a purchase, which helps to keep this
            website running. Results are AI generated and may contain fabricated statements and broken links.
          </em>
          {recResponse.recommendations.length === 0 && ErrorResponseParser({ valid: true, message: 'No results' })}
          {recResponse.recommendations.map((product, index) => (
            <ProductCard product={product} key={index} />
          ))}
          {recResponse.recommendations.length > 0 && <Footer />}
        </section>
      )}
    </main>
  )
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
