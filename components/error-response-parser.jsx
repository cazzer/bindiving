export default function ErrorResponseParse({ valid, message }) {
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
    return `Request timed out. Feel free to try again, (or try using a shorter query if the problem persists).`
  }

  return message
}
