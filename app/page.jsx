'use client'

import { useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

const SITE_RECAPTCHA_KEY = process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY
const ASSOCIATE_ID = 'bindiving-20'

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [captchaValue, setCaptchaValue] = useState(null)
  const [recResponse, setRecResponse] = useState(null)
  const captcha = useRef()

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  function onCaptchaChange(value) {
    setCaptchaValue(value)
  }

  async function onSearch(event) {
    event.preventDefault()

    // captcha.current?.reset()

    setApiRequestState('pending')
    const response = await fetch(`${location.origin}/api/recommendations?query=${query}&recaptcha=${captchaValue}`, {
      method: 'POST'
    })

    try {
      const result = await response.json()
      setApiRequestState('resolved')
      setRecResponse(result)
    } catch (error) {
      setApiRequestState('rejected')
      setRecResponse({
        valid: false,
        message: error.message
      })
    }
  }

  return (
    <main className="flex flex-col gap-8 sm:gap-16">
      {!recResponse?.recommendations?.length && (
        <section className="flex flex-col items-start gap-3 sm:gap-4">
          <p className="text-lg">
            There is a lot of content on Amazon. Describe what you&apos;re looking for and we&apos;ll use some AI magic
            to find a few recommentations.
          </p>
        </section>
      )}
      {apiRequestState !== 'pending' ? (
        <form className="text-base-content" onSubmit={onSearch}>
          <div className="container flex grow join">
            <input
              type="text"
              placeholder="Seach"
              className="input input-bordered w-full"
              value={query}
              onChange={onQueryUpdate}
            />
            <button type="submit" className="btn btn-primary" onClick={onSearch}>
              Search
            </button>
          </div>
          <div className="pt-4 flex container justify-center">
            {query.length > 0 && <ReCAPTCHA sitekey={SITE_RECAPTCHA_KEY} onChange={onCaptchaChange} ref={captcha} />}
          </div>
        </form>
      ) : (
        <p>Digging...</p>
      )}
      {apiRequestState !== 'pending' && recResponse?.valid == false && (
        <div>
          <h2>Error</h2>
          <pre>{recResponse.message}</pre>
        </div>
      )}
      {apiRequestState !== 'pending' && recResponse?.valid == true && (
        <section className="flex flex-col gap-4">
          <h2 className="mb-1">
            Links to Amazon are affiliate links. Using these links to purchase products supports for this website.
          </h2>
          <table className="table-lg">
            <tbody>
              {recResponse.recommendations.map((product, index) => (
                <tr key={index}>
                  <td>{product.product_name}</td>
                  <td>
                    <ul className="list-disc">
                      {product.pros.map((pro, index) => (
                        <li key={index}>{pro}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <ul className="list-disc">
                      {product.cons.map((con, index) => (
                        <li key={index}>{con}</li>
                      ))}
                    </ul>
                  </td>
                  <td>
                    <a href={makeAmazonLink(product.amazon_id)} className="btn" target="_blank">
                      View on Amazon
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  )
}

function maybeAdd$(price) {
  return price.toString()[0] === '$' ? price : `$${price}`
}

function makeAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}/?tag=${ASSOCIATE_ID}`
}
