'use client'

import { useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'

const SITE_RECAPTCHA_KEY = process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY
const ASSOCIATE_ID = 'bindiving-20'

export default function Page() {
  const [query, setQuery] = useState('')
  const [apiRequestState, setApiRequestState] = useState(null)
  const [captchaValue, setCaptchaValue] = useState(null)
  const [recResponse, setRecResponse] = useState({
    valid: true,
    recommendations: []
  })
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

    const result = await response.json()
    setApiRequestState('resolved')
    setRecResponse(result)
  }

  return (
    <main className="flex flex-col gap-8 sm:gap-16">
      <section className="flex flex-col items-start gap-3 sm:gap-4">
        <p className="text-lg">We have curated selections of products to help you find quality items on Amazon</p>
      </section>
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
        <p>thinking...</p>
      )}
      {recResponse.valid == false && (
        <div>
          <h2>Invalid Response!</h2>
          <pre>{recResponse.message}</pre>
        </div>
      )}
      {recResponse.valid == true && (
        <section className="flex flex-col gap-4">
          {/* <h2 className="mb-1">{query}</h2> */}
          <table className="table-lg">
            <tbody>
              {recResponse.recommendations.map((product, index) => (
                <tr key={index}>
                  <td>
                    <a href={product.link}>{product.product_name}</a>
                  </td>
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
                  <td>{product.price}</td>
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

function getProducts() {
  return [
    {
      product_name: 'SteelSeries Arctis Pro',
      pros: ['High-resolution audio', 'Comfortable and durable design', 'ClearCast microphone with excellent clarity'],
      cons: ['Expensive', 'Software can be complicated to use'],
      link: 'https://steelseries.com/gaming-headsets/arctis-pro',
      amazon_id: 'B09ZWCYQTX'
    },
    {
      product_name: 'HyperX Cloud II',
      pros: ['Excellent sound quality', 'Comfortable for long gaming sessions', 'Detachable microphone'],
      cons: ['No active noise cancellation', 'Limited software features'],
      link: 'https://www.hyperxgaming.com/unitedstates/us/headsets/cloud-ii-gaming-headset',
      amazon_id: 'B00SAYCVTQ'
    },
    {
      product_name: 'Razer BlackShark V2',
      pros: ['THX Spatial Audio', 'Comfortable memory foam ear cushions', 'Detachable Razer HyperClear Cardioid Mic'],
      cons: ['Software required for full feature access', 'Build quality could be better'],
      link: 'https://www.razer.com/gaming-headsets/razer-blackshark-v2',
      amazon_id: 'B086PKMZ21'
    }
  ]
}

function makeAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}/?tag=${ASSOCIATE_ID}`
}
