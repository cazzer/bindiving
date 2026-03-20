import { sendGAEvent } from '@next/third-parties/google'
import posthog from 'posthog-js'
import { useImage } from 'react-image'
import 'react-responsive-carousel/lib/styles/carousel.min.css' // requires a loader
import { Carousel } from 'react-responsive-carousel'

import { isValidSourceUrl } from '../lib/utils'
import placeholderImage from 'public/images/no-image-available.png'
import SourceCard from './source-card'

const ASSOCIATE_ID = 'bindiving-20'

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g

function parseMarkdownLinks(text) {
  if (text == null || typeof text !== 'string') return [{ type: 'text', value: String(text ?? '') }]
  const result = []
  let lastIndex = 0
  let match
  MARKDOWN_LINK_RE.lastIndex = 0
  while ((match = MARKDOWN_LINK_RE.exec(text)) !== null) {
    if (lastIndex < match.index) {
      result.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    result.push({ type: 'link', text: match[1], href: match[2] })
    lastIndex = MARKDOWN_LINK_RE.lastIndex
  }
  if (lastIndex < text.length) {
    result.push({ type: 'text', value: text.slice(lastIndex) })
  }
  return result.length ? result : [{ type: 'text', value: text }]
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

const imageStyle = {
  objectFit: 'contain',
  width: '100%',
  height: '100%'
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function MinusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  )
}

function normalizeSource(source) {
  if (source && typeof source === 'object' && source.link != null) {
    return {
      link: String(source.link),
      description: source.description != null ? String(source.description) : undefined
    }
  }
  const s = typeof source === 'string' ? source.trim() : ''
  if (!s) return { link: '', description: undefined }
  const idx = s.indexOf(' (')
  if (idx > 0 && s.includes(')', idx)) {
    return {
      link: s.slice(0, idx).trim(),
      description: s.slice(idx + 2, s.lastIndexOf(')')).trim()
    }
  }
  return { link: s, description: undefined }
}

function normalizeProduct(p) {
  // Normalize, filter invalid, and deduplicate sources by link
  const sources = Array.isArray(p?.sources)
    ? p.sources
        .map(normalizeSource)
        .filter((s) => s.link && isValidSourceUrl(s.link))
        .filter(
          (source, index, arr) =>
            // Keep only first occurrence of each unique link
            arr.findIndex((s) => s.link === source.link) === index
        )
    : []

  return {
    ...p,
    pros: Array.isArray(p?.pros) ? p.pros : [],
    cons: Array.isArray(p?.cons) ? p.cons : [],
    sources
  }
}

export default function ProductCard({ product: item, resolvedLinks }) {
  const status = item._resolveStatus ?? 'resolved'
  const product = normalizeProduct(item._resolved ?? item)
  const isPending = status === 'pending'
  const isError = status === 'error'
  const { src } = useImage({
    srcList: product.image_url ? [product.image_url, placeholderImage.src] : [placeholderImage.src]
  })

  function onLinkClick() {
    sendGAEvent({ event: 'amazon_link_clicked', value: product })
    posthog.capture('product_link_clicked', {
      product_name: product.product_name,
      amazon_id: product.amazon_id,
      brand: product.brand,
      price: product.price,
      resolver: product.resolver
    })
  }

  return (
    <div className="text-base-content card md:card-side bg-base-100 shadow-xl">
      <figure
        className="w-full p-4 md:w-96 md:min-w-96 md:shrink-0 md:pl-6 md:pt-6 md:pb-6 md:pr-4"
        style={{ alignItems: 'normal' }}
      >
        <div className="aspect-[4/3] w-full overflow-hidden rounded-lg flex items-center justify-center border border-[var(--image-frame-border)]">
          {isPending ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-base-content/60">
              Checking the find…
            </div>
          ) : isError ? (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-warning">
              Couldn&apos;t load link
            </div>
          ) : product.resolver === 'amazon' && product.images?.length ? (
            <Carousel
              dynamicHeight={false}
              showThumbs={false}
              className="h-full w-full [&_.carousel]:!h-full [&_.carousel-slider]:!h-full [&_.slider-wrapper]:!h-full [&_.slide]:!h-full [&_.slide]:!flex [&_.slide]:!items-center [&_.slide]:!justify-center"
            >
              {product.images.map((image, index) => (
                <div key={index} className="h-full w-full flex items-center justify-center">
                  <img style={imageStyle} src={image} alt={`Image ${index + 1} of ${product.product_name}`} />
                </div>
              ))}
            </Carousel>
          ) : (
            <img
              style={imageStyle}
              src={src}
              alt={`Image of ${product.product_name}`}
              className="max-h-full max-w-full"
            />
          )}
        </div>
      </figure>
      <div className="card-body p-3 sm:p-6 min-w-0">
        <h2 className="card-title break-words">{product.product_name}</h2>
        {product.brand && <h3>Sold by: {product.brand}</h3>}
        <h3>
          {product.price != null && product.price !== '' ? product.price : null}{' '}
          {product.blackFriday && <em>Black Friday deal!</em>}
          {product.resolver === 'brave' && product.price != null && product.price !== '' ? <em>(estimate)</em> : null}
        </h3>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start min-w-0">
          <div className="flex min-w-0 flex-col gap-1.5 sm:grow">
            <p
              className="flex items-center gap-1.5 text-sm font-bold text-emerald-800 dark:text-emerald-400"
              aria-hidden
            >
              <CheckIcon />
              Pros
            </p>
            <ul className="list-disc list-inside space-y-1 min-w-0 break-words">
              {product.pros.map((pro, index) => (
                <li key={index} className="pl-[22px] [text-indent:-22px] break-words">
                  {renderWithMarkdownLinks(pro, `pro-${index}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5 sm:grow">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-400" aria-hidden>
              <MinusIcon />
              Cons
            </p>
            <ul className="list-disc list-inside space-y-1 min-w-0 break-words">
              {product.cons.map((con, index) => (
                <li key={index} className="pl-[22px] [text-indent:-22px] break-words">
                  {renderWithMarkdownLinks(con, `con-${index}`)}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="container flex min-w-0 grow flex-col">
          <p className="text-xs text-slate-600">
            Sources:
            {product.sources.length ? (
              <ul className="mt-1.5 min-w-0 space-y-1.5">
                {product.sources.map((source, index) => (
                  <SourceCard
                    key={index}
                    source={source}
                    index={index}
                    origin={typeof location !== 'undefined' ? location.origin : ''}
                    initialPreview={resolvedLinks?.[source?.link ?? source]}
                  />
                ))}
              </ul>
            ) : (
              ' —'
            )}
          </p>
        </div>
        <div className="card-actions justify-end">
          {isPending ? (
            <span className="btn btn-primary btn-disabled">Checking the find…</span>
          ) : isError ? (
            <span className="btn btn-ghost btn-disabled text-warning">Couldn&apos;t load link</span>
          ) : product.amazon_id ? (
            <a
              href={makeAmazonLink(product.amazon_id)}
              className="btn btn-primary"
              target="_blank"
              rel="noreferrer"
              onClick={onLinkClick}
            >
              View on Amazon
            </a>
          ) : (
            <span className="btn btn-ghost btn-disabled">No link</span>
          )}
        </div>
      </div>
    </div>
  )
}

function makeAmazonLink(asin) {
  return `https://www.amazon.com/dp/${asin}/?tag=${ASSOCIATE_ID}`
}
