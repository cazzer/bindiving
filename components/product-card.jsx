import { sendGAEvent } from '@next/third-parties/google'
import { useImage } from 'react-image'
import 'react-responsive-carousel/lib/styles/carousel.min.css' // requires a loader
import { Carousel } from 'react-responsive-carousel'

import placeholderImage from 'public/images/no-image-available.png'

const ASSOCIATE_ID = 'bindiving-20'

export default function ProductCard({ product }) {
  const { src } = useImage({
    srcList: [product.image_url, placeholderImage.src]
  })

  function onLinkClick() {
    sendGAEvent({ event: 'amazon-link-clicked', value: product })
  }

  return (
    <div className="text-base-content card md:card-side bg-base-100 shadow-xl">
      <figure className="max-h-60 w-80 self-center">
        {product.resolver == 'amazon' && product.images?.length ? (
          <Carousel dynamicHeight={false} showThumbs={false}>
            {product.images.map((image, index) => (
              <img key={index} src={image} alt={`Image ${index + 1} of ${product.product_name}`} />
            ))}
          </Carousel>
        ) : (
          <img src={src} alt={`Image of ${product.product_name}`} />
        )}
      </figure>
      <div className="card-body">
        <h2 className="card-title">{product.product_name}</h2>
        {product.resolver == 'amazon' && <h3>{product.price}</h3>}
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
