import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#183D32',
        'forest-deep': '#244E40',
        beige: '#D8C7A1',
        warm: '#F8F7F2',
        ink: '#333333',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 24px 60px -30px rgba(24, 61, 50, 0.55)',
        lift: '0 30px 70px -40px rgba(24, 61, 50, 0.65)',
      },
      letterSpacing: {
        luxe: '0.28em',
      },
    },
  },
  plugins: [],
};

export default config;
