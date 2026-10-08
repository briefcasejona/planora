// Landing page for sign-in popups. Responses are handed back to the Planora
// window on this same origin and never sent to any server.
const isGoogle = new URLSearchParams(window.location.hash.slice(1)).get('state')?.startsWith('google-');
if (isGoogle) {
  const channel = new BroadcastChannel('planora-oauth');
  channel.postMessage({ hash: window.location.hash });
  channel.close();
  // Remove the token from this page and close the popup.
  history.replaceState(null, '', window.location.pathname);
  window.close();
} else {
  void import('@azure/msal-browser/redirect-bridge').then(({ broadcastResponseToMainFrame }) =>
    broadcastResponseToMainFrame().catch(() => window.close()),
  );
}
