import Link from 'next/link'
import { Card } from 'components/card'
import { RandomQuote } from 'components/random-quote'
import { Markdown } from 'components/markdown'
import { ContextAlert } from 'components/context-alert'
import { getNetlifyContext } from 'utils'

const cards = [
  //{ text: 'Hello', linkText: 'someLink', href: '/' }
]

const ctx = getNetlifyContext()

export default function Page() {
  const products = getProducts()
  return (
    <main className="flex flex-col gap-8 sm:gap-16">
      <section className="flex flex-col items-start gap-3 sm:gap-4">
        <h1 className="mb-0">Bin Diving</h1>
        <p className="text-lg">We have curated selections of products to help you find quality items on Amazon</p>
      </section>
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
      link: 'https://steelseries.com/gaming-headsets/arctis-pro'
    },
    {
      name: 'HyperX Cloud II',
      pros: ['Excellent sound quality', 'Comfortable for long gaming sessions', 'Detachable microphone'],
      cons: ['No active noise cancellation', 'Limited software features'],
      link: 'https://www.hyperxgaming.com/unitedstates/us/headsets/cloud-ii-gaming-headset'
    },
    {
      name: 'Razer BlackShark V2',
      pros: ['THX Spatial Audio', 'Comfortable memory foam ear cushions', 'Detachable Razer HyperClear Cardioid Mic'],
      cons: ['Software required for full feature access', 'Build quality could be better'],
      link: 'https://www.razer.com/gaming-headsets/razer-blackshark-v2'
    }
  ]
}
