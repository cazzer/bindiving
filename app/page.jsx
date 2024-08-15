'use client'

import { useState } from 'react'
import { sendGAEvent } from '@next/third-parties/google'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

import ProductCard from '../components/product-card'
import SearchBox from '../components/search'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const randomPlaceholder = getRandomPlaceholder()

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  async function onSearch(event) {
    event.preventDefault()
    const recaptchaToken = await executeRecaptcha('search')
    sendGAEvent({ event: 'search', value: query })

    setApiRequestState('pending')
    // initiate thread
    const threadResponse = await fetch(`${location.origin}/api/assistant?query=${query}&recaptcha=${recaptchaToken}`, {
      method: 'POST'
    })

    let threadResult
    try {
      threadResult = await threadResponse.json()
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: error.message
      })

      return
    }

    await sleep(8000)

    // retrieve messages
    const messageResponse = await fetch(
      `${location.origin}/api/read-thread?thread-id=${threadResult.threadId}&run-id=${threadResult.runId}`,
      {
        method: 'POST'
      }
    )

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
    <main className="flex flex-col gap-6 sm:gap-6">
      {!recResponse?.recommendations?.length && apiRequestState !== 'pending' && (
        <section className="flex flex-col items-start gap-3 sm:gap-4">
          <p className="text-lg">
            There is a lot to dig through on Amazon. Describe what you&apos;re looking for and we&apos;ll use some AI
            magic to find a few recommentations.
          </p>
        </section>
      )}
      {apiRequestState !== 'pending' ? (
        <form className="text-base-content" onSubmit={onSearch}>
          <div className="container flex grow join">
            <SearchBox placeholder={randomPlaceholder} value={query} onChange={onQueryUpdate} />
            <button type="submit" className="btn btn-primary" onClick={onSearch}>
              Search
            </button>
          </div>
        </form>
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
          {recResponse.recommendations.legnth == 0 && ErrorResponseParser({ valid: true, message: 'No results' })}
          {recResponse.recommendations.map((product, index) => (
            <ProductCard product={product} key={index} />
          ))}
        </section>
      )}
    </main>
  )
}

function getRandomPlaceholder() {
  const placeholders = [
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
  ]

  return placeholders[Math.floor(Math.random() * placeholders.length)]
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
