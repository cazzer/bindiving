const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://bindiving.com'

export function getSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Bin Diving',
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  }
}

export function getWebPageJsonLd({ url, title, description, query }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    name: title,
    description
  }
  if (query) data.about = query
  return data
}

