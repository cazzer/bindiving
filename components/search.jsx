import { useEffect, useState } from 'react'

export default function SearchBox({ value, onChange, placeholders }) {
  const [placeholderValue, setPlaceholderValue] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)

  useEffect(() => {
    const placeholderInterval = setInterval(async () => {
      if (placeholderValue.length === placeholders[placeholderIndex].length + 30) {
        setPlaceholderIndex(placeholderIndex < placeholders.length - 1 ? placeholderIndex + 1 : 0)
        setPlaceholderValue('')
      } else if (placeholderValue.length >= placeholders[placeholderIndex].length) {
        setPlaceholderValue(placeholderValue + ' ')
      } else {
        setPlaceholderValue(placeholders[placeholderIndex].substring(0, placeholderValue.length + 1))
      }
    }, 45)

    return () => clearInterval(placeholderInterval)
  })

  return <input autoFocus type="text" className="input input-bordered w-full" value={value} onChange={onChange} />
}
