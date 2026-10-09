// Google sign-in for the desktop app. Google refuses sign-ins inside app windows,
// so the sign-in happens in the system browser. Google sends it back to
// http://localhost:47823/auth-redirect.html, which this app serves itself; that
// page posts Google's answer to /oauth/google. Only an answer for the sign-in
// that is waiting right now (same random state) is accepted.
const TIMEOUT_MS = 5 * 60 * 1000;

function createGoogleWaiter(now = () => Date.now()) {
  let pending = null;
  return {
    /** Start waiting for the answer to the sign-in with this state. */
    wait(state) {
      if (pending) pending.reject(new Error('google-auth-replaced'));
      return new Promise((resolve, reject) => {
        pending = { state, until: now() + TIMEOUT_MS, resolve, reject };
      });
    },
    /** Handle a posted answer; returns the HTTP status to send back. */
    receive(body) {
      const hash = String(body || '');
      const state = new URLSearchParams(hash.replace(/^#/, '')).get('state');
      if (!pending || !state || state !== pending.state) return 400;
      const p = pending;
      pending = null;
      if (now() > p.until) {
        p.reject(new Error('google-auth-timeout'));
        return 410;
      }
      p.resolve(hash);
      return 204;
    },
  };
}

module.exports = { createGoogleWaiter };
