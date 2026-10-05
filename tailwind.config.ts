import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--c-bg)',
        band: 'var(--c-band)',
        panel: 'var(--c-panel)',
        fg: 'var(--c-fg)',
        'fg-muted': 'var(--c-fg-muted)',
        'fg-subtle': 'var(--c-fg-subtle)',
        rule: 'var(--c-rule)',
        'rule-strong': 'var(--c-rule-strong)',
        spot: 'var(--c-spot)',
        'spot-dark': 'var(--c-spot-dark)',
        'spot-fg': 'var(--c-spot-fg)',
        'spot-soft': 'var(--c-spot-soft)',
      },
      fontFamily: {
        // Roles are composed in globals.css, not here: a Bangla headline must
        // never borrow a Latin serif for glyphs the Latin face does not carry.
        sans: ['var(--font-ui)'],
        bn: ['var(--font-bn)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 160ms ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;