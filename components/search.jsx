import { useEffect, useState } from 'react'

export default function SearchBox({ value, onChange, placeholder }) {
  const [currentPlaceholder, setPlaceholder] = useState('')

  useEffect(() => {
    const placeholderInterval = setInterval(() => {
      if (placeholder.length === currentPlaceholder.length) {
        return clearInterval(placeholderInterval)
      }
      setPlaceholder(placeholder.substring(0, currentPlaceholder.length + 1))
    }, 45)

    return () => clearInterval(placeholderInterval)
  })
  return (
    <input
      autoFocus
      type="text"
      placeholder={currentPlaceholder}
      className="input input-bordered w-full"
      value={value}
      onChange={onChange}
    />
  )
}
