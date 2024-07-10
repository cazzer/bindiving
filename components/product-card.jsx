import { sendGAEvent } from '@next/third-parties/google'

const ASSOCIATE_ID = 'bindiving-20'

export default function ProductCard({ product }) {
  function onLinkClick() {
    sendGAEvent({ event: 'amazon-link-clicked', value: product })
  }

  return (
    <div className="text-base-content card md:card-side bg-base-100 shadow-xl">
      <figure className="max-h-60 w-80 self-center">
        <img src={product.image_url} alt={`Image of ${product.product_name}`} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{product.product_name}</h2>
        <div className="container flex row">
          <div className="container flex grow px-4">
            <ul className="list-disc">
              {product.pros.map((pro, index) => (
                <li key={index}>{pro}</li>
              ))}
            </ul>
          </div>
          <div className="container flex grow px-4">
            <ul className="list-disc">
              {product.cons.map((con, index) => (
                <li key={index}>{con}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container flex grow">
          <p className="text-xs text-slate-600">
            Sources:{' '}
            {product.sources.map((source, index) => {
              const url = new URL(source)
              return (
                <a href={source} key={index} className="px-1" target="_blank">
                  {url.host.replace('www.', '')}
                </a>
              )
            })}
          </p>
        </div>
        <div className="card-actions justify-end">
          <a href={makeAmazonLink(product.amazon_id)} className="btn btn-primary" target="_blank" onClick={onLinkClick}>
            View on Amazon
          </a>
        </div>
      </div>
    </div>
  )
}

function makeAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}/?tag=${ASSOCIATE_ID}`
}

function maybeAdd$(price) {
  return price.toString()[0] === '$' ? price : `$${price}`
}
