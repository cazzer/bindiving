import { useEffect, useState } from 'react'

export default function Digging() {
  const [diggingInfo, setDiggingInfo] = useState('Digging...')

  useEffect(() => {
    const diggingInterval = setTimeout(() => {
      setDiggingInfo('This will quite literally take a minute...hang tight!')
    }, 5000)

    return () => clearInterval(diggingInterval)
  })

  useEffect(() => {
    const diggingInterval = setTimeout(() => {
      setDiggingInfo(`I'm still thinking...or at least asking ChatGPT to think for me`)
    }, 20000)

    return () => clearInterval(diggingInterval)
  })

  useEffect(() => {
    const diggingInterval = setTimeout(() => {
      setDiggingInfo(`We're almost there fam, hold on!`)
    }, 45000)

    return () => clearInterval(diggingInterval)
  })

  return <p className="center">{diggingInfo}</p>
}
