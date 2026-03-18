import { GoogleAnalytics } from '@next/third-parties/google'

import '../styles/globals.css'
import { Footer } from '../components/footer'
import { Header } from '../components/header'
import { RecommendationsProvider } from '../contexts/recommendations-context'
import { ThemeProvider } from '../contexts/theme-context'
import GoogleCaptchaWrapper from 'components/google-recaptcha-provider'
import { getSiteJsonLd } from './lib/structured-data'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bindiving.com'

export const metadata = {
  title: {
    template: '%s | Bin Diving',
    default: 'Bin Diving'
  },
  description: 'AI-powered product recommendations from the depths of the internet. Describe what you want and we’ll dig it up.',
  openGraph: {
    title: 'Bin Diving',
    description: 'AI-powered product recommendations from the depths of the internet. Describe what you want and we’ll dig it up.',
    url: siteUrl,
    siteName: 'Bin Diving',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bin Diving',
    description: 'AI-powered product recommendations from the depths of the internet. Describe what you want and we’ll dig it up.'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
        <meta name="llm-manifest" content="https://bindiving.com/llm.txt" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var m=localStorage.getItem('bindiving_theme')||'auto';var t=m==='dark'?'lofi-dark':m==='light'?'lofi':window.matchMedia('(prefers-color-scheme: dark)').matches?'lofi-dark':'lofi';document.documentElement.setAttribute('data-theme',t);})();`
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(getSiteJsonLd()) }}
        />
      </head>
      <GoogleAnalytics gaId="G-JZ9YSG1L4D" />
      <body className="antialiased theme-page bg-hero-gradient min-h-screen">
        <div className="flex flex-col min-h-screen px-3 sm:px-6 md:px-12">
          <div className="flex flex-col w-full max-w-5xl mx-auto grow">
            <ThemeProvider>
              <GoogleCaptchaWrapper>
                <RecommendationsProvider>
                  <Header />
                  <div className="grow">{children}</div>
                </RecommendationsProvider>
              </GoogleCaptchaWrapper>
            </ThemeProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
