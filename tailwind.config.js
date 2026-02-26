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
        'hero-gradient': 'var(--hero-gradient)'
      },
      colors: {
        neutral: colors.neutral
      },
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['Fraunces', 'Georgia', 'serif']
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
      },
      {
        'lofi-dark': {
          primary: '#2bdcd2',
          'primary-content': '#0c0c0c',
          secondary: '#016968',
          'base-100': '#171717',
          'base-200': '#262626',
          'base-300': '#404040',
          'base-content': '#e5e5e5',
          neutral: '#262626',
          'neutral-content': '#e5e5e5',
          'info': '#2bdcd2',
          'info-content': '#0c0c0c'
        }
      }
    ]
  },
  plugins: [require('daisyui')]
}
