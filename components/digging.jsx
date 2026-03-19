import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function Digging({ streamStatus }) {
  const [fallbackInfo, setFallbackInfo] = useState('Digging...')
  const [currentStatus, setCurrentStatus] = useState(null)
  const [history, setHistory] = useState([]) // newest first: [{ id, text }]
  const prevStatusRef = useRef(null)
  const currentStatusRef = useRef(null)

  const containerRef = useRef(null)
  const liveRef = useRef(null)
  const prevContainerHeightRef = useRef(null)

  const historyItemRefs = useRef(new Map()) // id -> element
  const prevRectsRef = useRef(new Map()) // id -> DOMRect
  const prevHistoryIdsRef = useRef(new Set())

  const isWebDiggingText = (s) =>
    String(s).toLowerCase().includes('digging through the web')

  useEffect(() => {
    if (!streamStatus) {
      setCurrentStatus(null)
      currentStatusRef.current = null
      prevStatusRef.current = null
      setHistory([])
      return
    }

    if (streamStatus === prevStatusRef.current) return
    prevStatusRef.current = streamStatus

    const normalized = String(streamStatus)
    const prevLive = currentStatusRef.current
    const wasWebDigging = prevLive ? isWebDiggingText(prevLive) : false

    // Always update the live/current line.
    setCurrentStatus(normalized)
    currentStatusRef.current = normalized

    // Push the previous live line into history unless it *was* the special web-digging message.
    // This keeps "Digging through the web" as a replace-in-place live line (never stored in history),
    // while still letting other messages slide down into the stack.
    if (prevLive && prevLive !== normalized && !wasWebDigging) {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      setHistory((prev) => [{ id, text: prevLive }, ...prev].slice(0, 8))
    }
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setFallbackInfo('This bin is deep... give it a sec!'), 5000)
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(
      () => setFallbackInfo('Still digging... the good stuff is buried in there.'),
      20000
    )
    return () => clearTimeout(t)
  }, [streamStatus])

  useEffect(() => {
    if (streamStatus) return
    const t = setTimeout(() => setFallbackInfo('Almost there... one more scoop!'), 45000)
    return () => clearTimeout(t)
  }, [streamStatus])

  const live = currentStatus ?? fallbackInfo

  useLayoutEffect(() => {
    const raf = (cb) => (typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(cb) : cb())

    const containerEl = containerRef.current
    const liveEl = liveRef.current

    if (containerEl) {
      const nextHeight = containerEl.scrollHeight
      const prevHeight = prevContainerHeightRef.current

      if (prevHeight != null && Math.abs(nextHeight - prevHeight) > 0.5) {
        containerEl.style.height = `${prevHeight}px`
        containerEl.style.overflow = 'hidden'
        containerEl.style.transition = 'height 240ms ease'
        containerEl.getBoundingClientRect() // force reflow

        raf(() => {
          containerEl.style.height = `${nextHeight}px`
        })

        const onEnd = () => {
          containerEl.style.transition = ''
          containerEl.style.height = 'auto'
          containerEl.style.overflow = ''
          containerEl.removeEventListener('transitionend', onEnd)
        }

        containerEl.addEventListener('transitionend', onEnd)
      }

      prevContainerHeightRef.current = nextHeight
    }

    // Fade-in-down for the live line.
    if (liveEl) {
      liveEl.style.transform = 'translateY(-6px)'
      liveEl.style.opacity = '0'
      liveEl.style.transition = 'transform 220ms ease, opacity 220ms ease'
      liveEl.getBoundingClientRect() // force reflow
      raf(() => {
        liveEl.style.transform = 'translateY(0px)'
        liveEl.style.opacity = '1'
      })
      setTimeout(() => {
        if (!liveEl) return
        liveEl.style.transition = ''
        liveEl.style.transform = ''
        liveEl.style.opacity = ''
      }, 240)
    }

    // Slide/enter animations for history items.
    const prevRects = prevRectsRef.current
    const nextRects = new Map()
    const prevIds = prevHistoryIdsRef.current
    const nextIds = new Set(history.map((h) => h.id))

    for (const h of history) {
      const el = historyItemRefs.current.get(h.id)
      if (!el) continue

      const rect = el.getBoundingClientRect()
      nextRects.set(h.id, rect)

      const isNew = !prevIds.has(h.id)
      const prev = prevRects.get(h.id)

      if (isNew) {
        el.style.transform = 'translateY(-6px)'
        el.style.opacity = '0'
        el.style.transition = 'transform 220ms ease, opacity 220ms ease'
        el.getBoundingClientRect() // force reflow
        raf(() => {
          el.style.transform = 'translateY(0px)'
          el.style.opacity = '1'
        })
        setTimeout(() => {
          el.style.transition = ''
          el.style.transform = ''
          el.style.opacity = ''
        }, 240)
      } else if (prev) {
        // FLIP: translate to new position smoothly.
        const dy = prev.top - rect.top
        if (Math.abs(dy) > 0.5) {
          el.style.transform = `translateY(${dy}px)`
          el.style.opacity = '1'
          el.style.transition = 'transform 220ms ease'
          el.getBoundingClientRect() // force reflow
          raf(() => {
            el.style.transform = 'translateY(0px)'
          })
          setTimeout(() => {
            el.style.transition = ''
            el.style.transform = ''
          }, 230)
        }
      }
    }

    prevRectsRef.current = nextRects
    prevHistoryIdsRef.current = nextIds
  }, [currentStatus, history, fallbackInfo])

  return (
    <div className="w-full text-center py-8 sm:py-10">
      <div
        ref={containerRef}
        className="mx-auto max-w-2xl flex flex-col gap-2 items-center text-center"
      >
        <p ref={liveRef} className="text-lg sm:text-xl font-display font-medium text-base-content">
          {live}
        </p>

        {history.length > 0 && (
          <div className="w-full max-w-xl text-center">
            <ul className="space-y-1">
              {history.map((h) => (
                <li
                  key={h.id}
                  ref={(el) => {
                    if (el) historyItemRefs.current.set(h.id, el)
                    else historyItemRefs.current.delete(h.id)
                  }}
                  className="text-lg sm:text-xl font-display font-medium text-base-content"
                >
                  {h.text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
