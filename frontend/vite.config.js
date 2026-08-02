import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// The install icon. Cloudinary rather than a bundled file, so the deployment
// ships no images of its own; kept as a literal because vite.config runs
// before any app module and cannot import the manifest.
const PWA_ICON = 'https://res.cloudinary.com/juqwggy5/image/upload/v1785663432/bharadwaj-cafe/site/logo.png';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // injectManifest: we own the service worker, because push handling
      // cannot be expressed through generateSW's config.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,jpg,svg,woff2}'],
      },
      manifest: {
        name: "Bharadwaj's Cafe",
        short_name: 'Bharadwaj',
        description: 'Order coffee, track your order, and collect loyalty points.',
        theme_color: '#3b141c',
        background_color: '#3b141c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        // Cloudinary, like every other image. These pointed at /img/logo.png,
        // which no longer exists — the build would still have succeeded and
        // the installed app would simply have had no icon.
        icons: [
          { src: PWA_ICON, sizes: '192x192', type: 'image/png' },
          { src: PWA_ICON, sizes: '512x512', type: 'image/png' },
          { src: PWA_ICON, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    // Each file spins up its own jsdom; running them concurrently starves
    // userEvent's timers on slower machines and produces flaky waitFor timeouts.
    fileParallelism: false,
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/test/**', 'src/main.jsx'],
    },
  },
});
