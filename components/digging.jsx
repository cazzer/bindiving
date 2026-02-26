import { useEffect, useState } from 'react'

export default function Digging({ streamStatus }) {
  const [diggingInfo, setDiggingInfo] = useState('Digging...')

  useEffect(() => {
    if (streamStatus) setDiggingInfo(streamStatus)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setDiggingInfo('This bin is deep... give it a sec!'), 5000)
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(
      () => setDiggingInfo('Still digging... the good stuff is buried in there.'),
      20000
    )
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setDiggingInfo('Almost there... one more scoop!'), 45000)
    return () => clearTimeout(t)
  }, [streamStatus])

  return (
    <div className="w-full text-center py-8 sm:py-10">
      <p className="text-lg sm:text-xl font-display font-medium text-base-content">
        {diggingInfo}
      </p>
    </div>
  )
}
