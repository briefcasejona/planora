// Optional at-rest encryption. A passphrase is stretched with PBKDF2 into an
// AES-GCM key that lives only in memory; it is never stored or sent anywhere.

const ITERATIONS = 310_000;
const VERIFIER = 'planora-ok';

export interface EncryptedBlob {
  iv: string;
  ct: string;
}

export interface CryptoConfig {
  salt: string;
  verifier: EncryptedBlob;
}

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptJSON(key: CryptoKey, value: unknown): Promise<EncryptedBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(value)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

export async function decryptJSON<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(blob.iv) }, key, fromB64(blob.ct));
  return JSON.parse(dec.decode(pt)) as T;
}

export async function createCryptoConfig(passphrase: string): Promise<{ config: CryptoConfig; key: CryptoKey }> {
  const salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(passphrase, salt);
  return { config: { salt, verifier: await encryptJSON(key, VERIFIER) }, key };
}

/** Returns the key when the passphrase is right, otherwise null. */
export async function unlock(passphrase: string, config: CryptoConfig): Promise<CryptoKey | null> {
  try {
    const key = await deriveKey(passphrase, config.salt);
    const v = await decryptJSON<string>(key, config.verifier);
    return v === VERIFIER ? key : null;
  } catch {
    return null;
  }
}
