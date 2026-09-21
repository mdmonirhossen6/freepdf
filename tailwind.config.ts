import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        'bg-subtle': 'var(--c-bg-subtle)',
        panel: 'var(--c-panel)',
        fg: 'var(--c-fg)',
        'fg-muted': 'var(--c-fg-muted)',
        'fg-subtle': 'var(--c-fg-subtle)',
        line: 'var(--c-line)',
        'line-strong': 'var(--c-line-strong)',
        accent: 'var(--c-accent)',
        'accent-fg': 'var(--c-accent-fg)',
        'accent-soft': 'var(--c-accent-soft)',
      },
      fontFamily: {
        sans: ['var(--font-ui)'],
        bn: ['var(--font-bn)'],
        display: ['var(--font-display)'],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 10px 30px -24px rgb(15 23 42 / 0.35)',
        pop: '0 24px 60px -28px rgb(15 23 42 / 0.45)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
        'rise-in': 'rise-in 200ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;