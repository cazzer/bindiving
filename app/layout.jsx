import { GoogleAnalytics } from '@next/third-parties/google'

import '../styles/globals.css'
import { Footer } from '../components/footer'
import { Header } from '../components/header'
import GoogleCaptchaWrapper from 'components/google-recaptcha-provider'

export const metadata = {
  title: {
    template: '%s | Bin Diving',
    default: 'Bin Diving'
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="lofi">
      <head>
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <GoogleAnalytics gaId="G-JZ9YSG1L4D" />
      <body className="antialiased text-white bg-blue-900">
        <div className="flex flex-col min-h-screen px-6 bg-grid-pattern sm:px-12">
          <div className="flex flex-col w-full max-w-5xl mx-auto grow">
            <Header />
            <GoogleCaptchaWrapper>
              <div className="grow">{children}</div>
            </GoogleCaptchaWrapper>
          </div>
        </div>
      </body>
    </html>
  )
}
