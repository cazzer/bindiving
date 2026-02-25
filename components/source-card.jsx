'use client'

import { useState, useEffect } from 'react'
import { LINK_PREVIEW_ENABLED } from '../config'

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

function parseMarkdownLinks(text) {
  if (text == null || typeof text !== 'string') return [{ type: 'text', value: String(text ?? '') }]
  const result = []
  let lastIndex = 0
  let match
  MARKDOWN_LINK_RE.lastIndex = 0
  while ((match = MARKDOWN_LINK_RE.exec(text)) !== null) {
    if (lastIndex < match.index) result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    result.push({ type: 'link', text: match[1], href: match[2] })
    lastIndex = MARKDOWN_LINK_RE.lastIndex
  }
  if (lastIndex < text.length) result.push({ type: 'text', value: text.slice(lastIndex) })
  return result.length ? result : [{ type: 'text', value: text }]
}

function getFirstMarkdownLinkUrl(text) {
  if (text == null || typeof text !== 'string') return null
  const match = text.match(/\[[^\]]+\]\((https?:\/\/[^)]+)\)/)
  return match ? match[1] : null
}

function renderWithMarkdownLinks(str, keyPrefix) {
  const parts = parseMarkdownLinks(str)
  return parts.map((part, i) =>
    part.type === 'link' ? (
      <a key={`${keyPrefix}-${i}`} href={part.href} target="_blank" rel="noreferrer">
        {part.text}
      </a>
    ) : (
      part.value
    )
  )
}

function FallbackSource({ source, index }) {
  const link = source?.link ?? ''
  const descLink = getFirstMarkdownLinkUrl(source?.description)
  const faviconSource = descLink || link
  if (!link) return null
  try {
    const displayLink = link || descLink
    const displayUrl = new URL(displayLink)
    let faviconHostname = displayUrl.hostname
    if (descLink) {
      try {
        faviconHostname = new URL(descLink).hostname
      } catch (_) {}
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${faviconHostname}&sz=16`
    return (
      <li className="pl-2 -indent-2">
        <img
          src={faviconUrl}
          alt=""
          className="mr-1.5 inline-block h-4 w-4 align-middle"
          width={16}
          height={16}
        />
        <a href={displayLink} target="_blank" rel="noreferrer" className="align-middle">
          {displayUrl.host.replace('www.', '')}
        </a>
        {source.description ? (
          <em className="text-slate-500 italic"> {renderWithMarkdownLinks(source.description, `src-${index}`)}</em>
        ) : null}
      </li>
    )
  } catch {
    return (
      <li className="pl-2 -indent-2">
        {link}
        {source.description ? (
          <em className="text-slate-500 italic"> {renderWithMarkdownLinks(source.description, `src-${index}`)}</em>
        ) : null}
      </li>
    )
  }
}

function isValidLink(link) {
  if (!link || typeof link !== 'string') return false
  const s = link.trim()
  if (!s.startsWith('http://') && !s.startsWith('https://')) return false
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export default function SourceCard({ source, index, origin }) {
  const link = source?.link ?? ''
  const [preview, setPreview] = useState(null)
  const [failed, setFailed] = useState(false)
  const shouldFetch = LINK_PREVIEW_ENABLED && isValidLink(link)

  useEffect(() => {
    if (!shouldFetch || !link || failed) return
    const url = `${origin || ''}/api/link-preview?url=${encodeURIComponent(link)}`
    fetch(url)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.statusText))))
      .then((data) => {
        if (data?.title || data?.description || data?.image) {
          setPreview({
            title: data.title || new URL(link).hostname.replace('www.', ''),
            description: data.description || '',
            image: data.image || '',
            url: data.url || link
          })
        } else {
          setFailed(true)
        }
      })
      .catch(() => setFailed(true))
  }, [shouldFetch, link, origin, failed])

  if (!link) return null

  if (!shouldFetch || failed || !preview) {
    return <FallbackSource source={source} index={index} />
  }

  const displayUrl = new URL(preview.url || link)
  const siteName = displayUrl.hostname.replace('www.', '')

  return (
    <li className="list-none">
      <a
        href={preview.url || link}
        target="_blank"
        rel="noreferrer"
        className="flex max-w-full min-w-0 overflow-hidden rounded-lg border border-base-300 bg-base-200/50 text-left no-underline shadow-sm transition hover:border-base-content/20 hover:shadow"
      >
        {preview.image ? (
          <div className="h-20 w-24 shrink-0 bg-base-300">
            <img
              src={preview.image}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        ) : null}
        <div className="min-w-0 flex-1 p-2">
          <div className="truncate text-xs font-medium text-base-content">{preview.title}</div>
          {preview.description ? (
            <div className="line-clamp-2 text-xs text-base-content/70">{preview.description}</div>
          ) : null}
          <div className="mt-0.5 text-xs text-base-content/50">{siteName}</div>
        </div>
      </a>
    </li>
  )
}
