'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import React from 'react'

export default function GoogleCaptchaWrapper({ children }) {
  const recaptchaKey = process?.env?.NEXT_PUBLIC_SITE_RECAPTCHA_KEY

  return (
    <GoogleReCaptchaProvider
      reCaptchaKey={recaptchaKey ?? 'NOT DEFINED'}
      scriptProps={{
        async: false,
        defer: false,
        appendTo: 'head',
        nonce: undefined
      }}
    >
      {children}
    </GoogleReCaptchaProvider>
  )
}
