import { useEffect, useState } from 'react'

export default function Digging({ streamStatus }) {
  const [diggingInfo, setDiggingInfo] = useState('Digging...')

  useEffect(() => {
    if (streamStatus) setDiggingInfo(streamStatus)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setDiggingInfo('This will quite literally take a minute...hang tight!'), 5000)
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(
      () => setDiggingInfo(`I'm still thinking...or at least asking ChatGPT to think for me`),
      20000
    )
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setDiggingInfo(`We're almost there fam, hold on!`), 45000)
    return () => clearTimeout(t)
  }, [streamStatus])

  return <p className="center">{diggingInfo}</p>
}
