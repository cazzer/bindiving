const ASSOCIATE_ID = 'bindiving-20'

export default function ProductCard({ product }) {
  return (
    <div className="text-base-content card md:card-side bg-base-100 shadow-xl">
      <figure className="max-h-60 w-80">
        <img src={product.image_url} alt={`Image of ${product.product_name}`} />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{product.product_name}</h2>
        <div className="container flex row px-4">
          <div className="container flex grow">
            <ul className="list-disc">
              {product.pros.map((pro, index) => (
                <li key={index}>{pro}</li>
              ))}
            </ul>
          </div>
          <div className="container flex grow">
            <ul className="list-disc">
              {product.cons.map((con, index) => (
                <li key={index}>{con}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="card-actions justify-end">
          <a href={makeAmazonLink(product.amazon_id)} className="btn btn-primary" target="_blank">
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
