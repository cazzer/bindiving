import { GoogleAnalytics } from '@next/third-parties/google'

import '../styles/globals.css'
import { Footer } from '../components/footer'
import { Header } from '../components/header'
import { SearchUIProvider } from '../contexts/search-ui-context'
import GoogleCaptchaWrapper from 'components/google-recaptcha-provider'

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
    <html lang="en" data-theme="lofi">
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <GoogleAnalytics gaId="G-JZ9YSG1L4D" />
      <body className="antialiased text-neutral-800 bg-white bg-hero-gradient min-h-screen">
        <div className="flex flex-col min-h-screen px-6 sm:px-12">
          <div className="flex flex-col w-full max-w-5xl mx-auto grow">
            <SearchUIProvider>
              <Header />
              <GoogleCaptchaWrapper>
                <div className="grow">{children}</div>
              </GoogleCaptchaWrapper>
            </SearchUIProvider>
          </div>
        </div>
      </body>
    </html>
  )
}
