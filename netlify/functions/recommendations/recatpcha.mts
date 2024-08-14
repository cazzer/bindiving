const CAPTCHA_SECRET_KEY = process.env.SITE_RECAPTCHA_SECRET

export async function processCaptcha(token) {
  const captchaResponse = await fetch(
    `https://www.google.com/recaptcha/api/siteverify?secret=${CAPTCHA_SECRET_KEY}&response=${token}`,
    {
      method: 'POST'
    }
  )

  const rawResponse = await new Response(captchaResponse.body).text()
  console.log(rawResponse)
  return JSON.parse(rawResponse)
}
