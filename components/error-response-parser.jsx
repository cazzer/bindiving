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
  if (!message || typeof message !== 'string') {
    return 'Something broke, quite possibly the AI. Slam that search button again and hopefully it will just start working.'
  }
  const m = message.trim()
  if (m.indexOf('Timeout') > -1) {
    return `Request timed out. Feel free to try again, (and try being less specific if the problem persists).`
  }
  if (m.indexOf('No results') > -1) {
    return `No recommendations returned. Try using different search terms without being too specific, (e.g. "bamboo bathmat", and not "bamboo bathmat with .5 inch beveled edges").`
  }
  // Show API/stream text (e.g. refusal, explanation) when we have it
  if (m.length > 0) return m
  return 'Something broke, quite possibly the AI. Slam that search button again and hopefully it will just start working.'
}
