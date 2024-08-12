import { useEffect, useState } from 'react'

export default function Digging() {
  const [diggingInfo, setDiggingInfo] = useState('Digging...')

  useEffect(() => {
    const diggingInterval = setTimeout(() => {
      setDiggingInfo('Parsing results...')
    }, 5000)

    return () => clearInterval(diggingInterval)
  })

  return <p className="center">{diggingInfo}</p>
}
