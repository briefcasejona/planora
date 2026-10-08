// Content-Security-Policy shared by the web build (meta tag) and the desktop app (HTTP header).
// The app may only talk to itself and, when the user links them, Microsoft and Google directly.
module.exports = [
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
