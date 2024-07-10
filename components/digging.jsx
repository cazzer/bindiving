import { useEffect, useState } from 'react'

export default function Digging() {
  const [diggingInfo, setDiggingInfo] = useState('Digging...')

  useEffect(() => {
    const diggingInterval = setTimeout(() => {
      setDiggingInfo('Digging...this dumpster is deep, give me a moment...')
    }, 5000)

    return () => clearInterval(diggingInterval)
  })

  return <p className="center">{diggingInfo}</p>
}
