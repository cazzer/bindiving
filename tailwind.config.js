const colors = require('tailwindcss/colors')
const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './netlify/functions/**/*.{js,ts,mts,mjs}' // Add Netlify functions if they contain Tailwind classes
  ],
  theme: {
    extend: {
      backgroundImage: {
        'grid-pattern':
          "linear-gradient(to bottom, theme('colors.neutral.950 / 0%'), theme('colors.neutral.950 / 100%')), url('/images/noise.png')",
        'hero-gradient':
          'radial-gradient(ellipse 80% 50% at 0% 0%, rgb(241 245 249), transparent 50%), radial-gradient(ellipse 80% 50% at 100% 100%, rgb(226 232 240), transparent 50%)'
      },
      colors: {
        neutral: colors.neutral
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans]
      }
    }
  },
  daisyui: {
    themes: [
      {
        lofi: {
          ...require('daisyui/src/theming/themes')['lofi'],
          primary: '#2bdcd2',
          'primary-content': '#171717',
          secondary: '#016968',
          info: '#2bdcd2',
          'info-content': '#171717'
        }
      }
    ]
  },
  plugins: [require('daisyui')]
}
