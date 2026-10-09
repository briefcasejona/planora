// Landing page for sign-ins. Responses are handed back to Planora on this
// device and never sent to any server. Google's answer arrives after the #,
// which browsers never send to a server either.
const hash = window.location.hash;
const state = new URLSearchParams(hash.slice(1)).get('state') ?? '';
const base = import.meta.env.BASE_URL;

function show(text: string): void {
  const p = document.querySelector('p');
  if (p) p.textContent = text;
}
const nl = navigator.language.toLowerCase().startsWith('nl');

if (state.startsWith('google-ios-')) {
  // iPhone home-screen app: same window, so keep the answer for the app and go back to it.
  sessionStorage.setItem('planora-google-response', hash);
  history.replaceState(null, '', window.location.pathname);
  window.location.replace(base);
} else if (state.startsWith('google-android-')) {
  // Opened in the system browser by the Android app: hand the answer back to the app.
  const back = 'app.planora://google' + hash;
  window.location.replace(back);
  // Some browsers only open an app after a tap: offer a button as well.
  show('');
  const a = document.createElement('a');
  a.href = back;
  a.textContent = nl ? 'Terug naar Planora' : 'Back to Planora';
  a.style.cssText =
    'display:inline-block;padding:.8rem 1.4rem;border-radius:.8rem;background:#4f46e5;color:#fff;font-weight:600;text-decoration:none';
  document.querySelector('p')?.append(a);
} else if (state.startsWith('google-desktop-')) {
  // Opened in the system browser by the desktop app, which serves this page itself:
  // pass the answer to it over this same local address.
  history.replaceState(null, '', window.location.pathname);
  fetch('/oauth/google', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: hash })
    .then((res) =>
      show(
        res.ok
          ? nl
            ? 'Gelukt! Je kunt dit venster sluiten en teruggaan naar Planora.'
            : 'Done! You can close this window and go back to Planora.'
          : nl
            ? 'Dit inloggen is verlopen. Probeer het opnieuw in Planora.'
            : 'This sign-in expired. Please try again in Planora.',
      ),
    )
    .catch(() =>
      show(
        nl
          ? 'Planora is niet geopend. Open Planora en probeer het opnieuw.'
          : 'Planora is not open. Open Planora and try again.',
      ),
    );
} else if (state.startsWith('google-')) {
  const channel = new BroadcastChannel('planora-oauth');
  channel.postMessage({ hash });
  channel.close();
  // Remove the token from this page and close the popup.
  history.replaceState(null, '', window.location.pathname);
  window.close();
} else {
  void import('@azure/msal-browser/redirect-bridge').then(({ broadcastResponseToMainFrame }) =>
    broadcastResponseToMainFrame().catch(() => window.close()),
  );
}
