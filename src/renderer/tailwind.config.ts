import type { Config } from 'tailwindcss';

// High-contrast palette tuned for bright, glare-lit operatory monitors:
// deep near-black backgrounds, saturated accent colors, large touch targets.
//
// Content globs are anchored to this config file's own directory (verified:
// relative globs like './app/**/*.{ts,tsx}' matched zero files, since `npm
// run build` invokes `next build src/renderer` from the repo root and some
// part of the resolution used that process cwd rather than src/renderer).
// __dirname on Windows returns backslash-separated paths, and `path.join`
// preserves those backslashes — but Tailwind's glob matcher needs forward
// slashes for `**` to work even on Windows, so a first attempt using
// `path.join(__dirname, ...)` still silently matched nothing. Normalizing to
// forward slashes explicitly is what actually fixed it.
const contentRoot = __dirname.replace(/\\/g, '/');

const config: Config = {
  content: [`${contentRoot}/app/**/*.{ts,tsx}`, `${contentRoot}/components/**/*.{ts,tsx}`],
  theme: {
    extend: {
      colors: {
        panel: {
          bg: '#0b1220',
          surface: '#121b2e',
          border: '#26344d',
        },
        accent: {
          cyan: '#38e1ff',
          amber: '#ffb020',
          red: '#ff4d5e',
          green: '#33d17a',
        },
      },
      fontSize: {
        clinical: ['1.05rem', { lineHeight: '1.6rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
