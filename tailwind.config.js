/** Colors resolve to CSS variables (RGB channels) so light/dark themes and alpha utilities both work. */
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './resource.html', './app/**/*.html', './src/**/*.{html,js}'],
  safelist: [{ pattern: /^tint-/ }],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: { DEFAULT: token('surface'), 2: token('surface2') },
        line: { DEFAULT: token('line'), 2: token('line2') },
        ink: { DEFAULT: token('ink'), 2: token('ink2') },
        mute: token('mute'),
        brand: { DEFAULT: token('brand'), d: token('brandD'), soft: token('brandSoft'), on: token('onBrand') },
        crane: { DEFAULT: token('crane'), soft: token('craneSoft'), ink: token('craneInk') },
        good: { DEFAULT: token('good'), soft: token('goodSoft') },
        warn: { DEFAULT: token('warn'), soft: token('warnSoft') },
        bad: { DEFAULT: token('bad'), soft: token('badSoft') },
        info: { DEFAULT: token('info'), soft: token('infoSoft') },
        nav: { DEFAULT: token('nav'), 2: token('nav2'), mid: token('navMid'), ink: token('navInk'), mute: token('navMute') },
        aqua: token('aqua'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Arabic"', 'Tahoma', 'Arial', 'sans-serif'],
        display: ['"Readex Pro"', '"IBM Plex Sans Arabic"', 'Tahoma', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'Menlo', 'Consolas', 'monospace'],
      },
      maxWidth: { page: '1180px', app: '1360px' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--c-shadow) / .06), 0 1px 1px rgb(var(--c-shadow) / .04)',
        pop: '0 12px 32px -12px rgb(var(--c-shadow) / .22), 0 2px 6px rgb(var(--c-shadow) / .06)',
        float: '0 30px 70px -28px rgb(var(--c-shadow) / .5)',
      },
      borderRadius: { card: '12px' },
    },
  },
  plugins: [],
};
