/**
 * Tailwind, themed to the design tokens this site already had.
 *
 * Every value below is copied from the `:root` block in style.css rather than
 * invented, so `bg-primary` and `var(--primary-color)` are the same colour to
 * the byte. That is what lets components move to utilities one at a time
 * without the page shifting underneath the ones that have not moved yet.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],

  // Preflight is Tailwind's own CSS reset. It stays off, because style.css
  // already ships a reset that the twenty stylesheets here are written
  // against — most visibly `img { width: 95% }`, which Preflight would
  // replace with `display:block; max-width:100%` and quietly resize every
  // image on every page that has not been migrated yet. Turning it on is the
  // last step of the migration, not the first.
  corePlugins: { preflight: false },

  theme: {
    extend: {
      colors: {
        white: 'var(--white-color)',
        dark: 'var(--dark-color)',
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        'light-pink': 'var(--light-pink-color)',
        'medium-gray': 'var(--medium-gray-color)',
      },

      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        script: ['Miniver', 'cursive'],
      },

      // Named rather than numeric, matching the --font-size-* scale. `text-n`
      // is the body size; there is deliberately no `text-base` alias, so a
      // stray Tailwind default cannot creep in looking like it belongs.
      fontSize: {
        s: 'var(--font-size-s)',
        n: 'var(--font-size-n)',
        m: 'var(--font-size-m)',
        l: 'var(--font-size-l)',
        xl: 'var(--font-size-xl)',
        xxl: 'var(--font-size-xxl)',
      },

      fontWeight: {
        normal: 'var(--font-weight-normal)',
        medium: 'var(--font-weight-medium)',
        semibold: 'var(--font-weight-semibold)',
        bold: 'var(--font-weight-bold)',
      },

      borderRadius: {
        s: 'var(--border-radius-s)',
        m: 'var(--border-radius-m)',
        circle: 'var(--border-radius-circle)',
      },

      maxWidth: {
        site: 'var(--site-max-width)',
      },
    },
  },

  plugins: [],
};
