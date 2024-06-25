'use client'

import { useState } from 'react'
import { GoogleReCaptcha } from 'react-google-recaptcha-v3'

const ASSOCIATE_ID = 'bindiving-20'

export default function Page() {
  const [query, setQuery] = useState('')
  const [captchaToken, setCaptchaToken] = useState('')

  function onQueryUpdate(event) {
    setQuery(event.target.value)
  }

  function onCaptchaChange(value) {
    setCaptchaValue(value)
  }

  function handleCaptchaVerify(token) {
    console.log('captcha verify called', token)
    setCaptchaToken(token)
  }

  async function onSearch(event) {
    event.preventDefault()
    console.log('search')

    const response = await fetch(`${location.origin}/api/recommendations?query=${query}`)

    const result = await response.json()
    console.log(result)
  }

  const products = getProducts()
  return (
    <main className="flex flex-col gap-8 sm:gap-16">
      <section className="flex flex-col items-start gap-3 sm:gap-4">
        <p className="text-lg">We have curated selections of products to help you find quality items on Amazon</p>
      </section>
      <form className="text-base-content" onSubmit={onSearch}>
        <div className="flex grow join">
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
        <GoogleReCaptcha onVerify={handleCaptchaVerify} />
      </form>
      {!!products?.length && (
        <section className="flex flex-col gap-4">
          <h2 className="mb-1">Gaming Headphones</h2>
          <table className="table-lg">
            <tbody>
              {products.map((product, index) => (
                <tr key={index}>
                  <td>
                    <a href={product.link}>{product.name}</a>
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
      name: 'SteelSeries Arctis Pro',
      pros: ['High-resolution audio', 'Comfortable and durable design', 'ClearCast microphone with excellent clarity'],
      cons: ['Expensive', 'Software can be complicated to use'],
      link: 'https://steelseries.com/gaming-headsets/arctis-pro',
      amazon_id: 'B09ZWCYQTX'
    },
    {
      name: 'HyperX Cloud II',
      pros: ['Excellent sound quality', 'Comfortable for long gaming sessions', 'Detachable microphone'],
      cons: ['No active noise cancellation', 'Limited software features'],
      link: 'https://www.hyperxgaming.com/unitedstates/us/headsets/cloud-ii-gaming-headset',
      amazon_id: 'B00SAYCVTQ'
    },
    {
      name: 'Razer BlackShark V2',
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
