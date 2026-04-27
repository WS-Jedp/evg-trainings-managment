import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './emails/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        evg: {
          orange: '#FF8C00',
          black: '#000000',
        },
      },
      fontFamily: {
        varsity: ['var(--font-varsity)', 'sans-serif'],
      },
    },
  },
}
export default config
