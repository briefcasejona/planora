import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Strict Content-Security-Policy for production builds. The app may only talk
 * to itself and, when the user links them, Microsoft and Google directly.
 * No analytics, CDNs or other third parties are allowed.
 */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://login.microsoftonline.com https://graph.microsoft.com https://www.googleapis.com https://oauth2.googleapis.com",
  'frame-src https://login.microsoftonline.com',
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'planora-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cspPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Planora',
        short_name: 'Planora',
        description: 'Plan je taken slim, privé op je eigen apparaat.',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { navigateFallback: '/index.html', navigateFallbackDenylist: [/auth-redirect/], globPatterns: ['**/*.{js,css,html,svg,woff2}'] },
    }),
  ],
  build: {
    rollupOptions: { input: { main: 'index.html', authRedirect: 'auth-redirect.html' } },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
