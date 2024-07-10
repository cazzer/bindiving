'use client'

import { useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { sendGAEvent } from '@next/third-parties/google'

import ProductCard from '../components/product-card'
import SearchBox from '../components/search'
import Digging from 'components/digging'
import ErrorResponseParser from 'components/error-response-parser'

const SITE_RECAPTCHA_KEY = process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [captchaValue, setCaptchaValue] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const captcha = useRef()

  const randomPlaceholder = getRandomPlaceholder()

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  function onCaptchaChange(value) {
    setCaptchaValue(value)
  }

  async function onSearch(event) {
    event.preventDefault()
    sendGAEvent({ event: 'search', value: query })

    // captcha.current?.reset()

    setApiRequestState('pending')
    // initiate thread
    const threadResponse = await fetch(`${location.origin}/api/assistant?query=${query}&recaptcha=${captchaValue}`, {
      method: 'POST'
    })

    let threadResult
    try {
      threadResult = await threadResponse.json()
      console.log('thread')
      console.log(threadResult)
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: error.message
      })
    }

    await sleep(3000)

    // retrieve messages
    const messageResponse = await fetch(
      `${location.origin}/api/read-thread?thread-id=${threadResult.threadId}&run-id=${threadResult.runId}`,
      {
        method: 'POST'
      }
    )

    try {
      const messageResult = await messageResponse.json()
      console.log('message')
      console.log(messageResult)
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
      {!recResponse?.recommendations?.length && (
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
            {/* <input
              type="text"
              placeholder={placeholder}
              className="input input-bordered w-full"
              value={query}
              onChange={onQueryUpdate}
            /> */}
            <button type="submit" className="btn btn-primary" onClick={onSearch}>
              Search
            </button>
          </div>
          <div className="pt-4 flex container justify-center">
            {query.length > 0 && <ReCAPTCHA sitekey={SITE_RECAPTCHA_KEY} onChange={onCaptchaChange} ref={captcha} />}
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
    `dress shoes without soles`
  ]

  return placeholders[Math.floor(Math.random() * placeholders.length)]
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
