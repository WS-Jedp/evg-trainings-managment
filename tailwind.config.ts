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
      boxShadow: {
        'orange-glow':    '0 0 20px rgba(255, 140, 0, 0.30)',
        'orange-glow-sm': '0 0 10px rgba(255, 140, 0, 0.20)',
      },
    },
  },
}
export default config
