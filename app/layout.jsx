import '../styles/globals.css'
import { Footer } from '../components/footer'
import { Header } from '../components/header'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

const SITE_RECAPTCHA_KEY = process.env.NEXT_PUBLIC_SITE_RECAPTCHA_KEY

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
      <body className="antialiased text-white bg-blue-900">
        <div className="flex flex-col min-h-screen px-6 bg-grid-pattern sm:px-12">
          <div className="flex flex-col w-full max-w-5xl mx-auto grow">
            <Header />
            <GoogleReCaptchaProvider reCaptchaKey={SITE_RECAPTCHA_KEY}>
              <div className="grow">{children}</div>
            </GoogleReCaptchaProvider>
            <Footer />
          </div>
        </div>
      </body>
    </html>
  )
}
