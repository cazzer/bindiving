export default function ErrorResponseParser({ valid, message }) {
  return (
    <div className="flex justify-center">
      <div className="card bg-secondary text-neutral-content w-96">
        <div className="card-body items-center">
          <h2 className="card-title">Awwww, shucks</h2>
          <p>{ErrorMessage(message)}</p>
        </div>
      </div>
    </div>
  )
}

function ErrorMessage(message) {
  if (message.indexOf('Timeout') > -1) {
    return `Request timed out. Feel free to try again, (and try being less specific if the problem persists).`
  } else if (message.indexOf('No results') > -1) {
    return `No recommendations returned. Try using different search terms without being too specific, (e.g. "bamboo bathmat", and not "bamboo bathmat with .5 inch beveled edges").`
  } else {
    return 'Something broke, quite possibly the AI. Slam that search button again and hopefully it wil just start working again.'
  }
}
