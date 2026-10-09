import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import CSP from './csp.cjs';

/** "/" for local, desktop and Android builds; "/planora/" for GitHub Pages. */
const base = process.env.VITE_BASE || '/';

/** Strict Content-Security-Policy in every built page (see csp.cjs). */
function cspPlugin(): Plugin {
  return {
    name: 'planora-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

/** GitHub Pages has no SPA routing: serve the app for unknown paths via 404.html. */
function spaFallbackPlugin(): Plugin {
  return {
    name: 'planora-404',
    apply: 'build',
    closeBundle() {
      copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'));
    },
  };
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    spaFallbackPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Planora',
        short_name: 'Planora',
        description: 'Plan je taken slim, privé op je eigen apparaat.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        navigateFallback: base + 'index.html',
        navigateFallbackDenylist: [/auth-redirect/],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  build: {
    rollupOptions: { input: { main: 'index.html', authRedirect: 'auth-redirect.html', download: 'download.html' } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
