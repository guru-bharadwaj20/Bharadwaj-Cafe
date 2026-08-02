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
      // The legacy stylesheets are written desktop-first: a base rule, then a
      // `max-width` media query that narrows it. Tailwind is mobile-first, so
      // faithfully porting those rules needs max-width variants, and the three
      // widths below are the only ones the twenty stylesheets ever used.
      //
      // Named rather than written as `max-[900px]:` at each call site, because
      // the arbitrary form compiles to `not all and (min-width: 900px)` — which
      // stops one hundredth of a pixel short of 900 and would not match the
      // rule it is replacing. `{ max: ... }` emits `(max-width: 900px)` exactly.
      //
      // Tailwind orders max-width screens widest-first, so `to-600` is emitted
      // after `to-900` and still wins where both apply, exactly as the source
      // files relied on their own ordering.
      screens: {
        'to-900': { max: '900px' },
        'to-768': { max: '768px' },
        'to-600': { max: '600px' },
      },

      colors: {
        white: 'var(--white-color)',
        dark: 'var(--dark-color)',
        primary: 'var(--primary-color)',
        secondary: 'var(--secondary-color)',
        'light-pink': 'var(--light-pink-color)',
        'medium-gray': 'var(--medium-gray-color)',

        // The footer runs on its own cool-slate palette, deliberately outside
        // the warm brand ramp. Named here because they repeat; the true
        // one-offs stay as arbitrary values at the point of use.
        'footer-slate': '#232f3e',
        'footer-deep': '#131921',
        'footer-link': '#ddd',

        // The analytics dashboard runs on its own palette, and unlike the rest
        // of the site it has a validated dark mode: two hand-checked sets of
        // values rather than an automatic inversion. The variables are declared
        // per mode on `.viz-root` in src/tailwind.css; these names are how a
        // utility reaches them. Prefixed `viz-` because `--text-primary` and
        // the brand's `--primary-color` are unrelated colours that would
        // otherwise both want to be called `primary`.
        'viz-surface-1': 'var(--surface-1)',
        'viz-surface-2': 'var(--surface-2)',
        'viz-text': 'var(--text-primary)',
        'viz-text-soft': 'var(--text-secondary)',
        'viz-text-muted': 'var(--text-muted)',
        'viz-series-1': 'var(--series-1)',
        'viz-series-2': 'var(--series-2)',
        'viz-good': 'var(--status-good)',
        'viz-critical': 'var(--status-critical)',
        'viz-grid': 'var(--grid)',
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

      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '25%': { transform: 'scale(1.2)' },
          '50%': { transform: 'scale(1)' },
        },

        // The glow on the current step of the order tracker. Named rather than
        // reusing Tailwind's own `pulse`, which fades opacity; this one holds
        // the step fully visible and breathes the shadow around it. It came
        // from order-history.css, where it was also called `pulse` — which
        // would have quietly shadowed the built-in one for the whole site.
        'track-pulse': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(243, 150, 28, 0.5)' },
          '50%': { boxShadow: '0 0 25px rgba(243, 150, 28, 0.8)' },
        },
      },

      animation: {
        heartbeat: 'heartbeat 1.5s ease-in-out infinite',
        'track-pulse': 'track-pulse 2s infinite',
      },
    },
  },

  plugins: [],
};
