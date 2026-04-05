const CAPTCHA_SECRET_KEY = process.env.SITE_RECAPTCHA_SECRET

export async function processCaptcha(token) {
  const params = new URLSearchParams({ secret: CAPTCHA_SECRET_KEY, response: token })
  const captchaResponse = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?${params}`,
    {
      method: 'POST'
    }
  )

  const rawResponse = await new Response(captchaResponse.body).text()
  return JSON.parse(rawResponse)
}
