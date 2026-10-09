// The sync file lives in Planora's own app folder in the user's OneDrive
// (Apps/Planora). With the Files.ReadWrite.AppFolder permission Planora can't
// see anything else in OneDrive. The file content is encrypted before upload.

/** Where the encrypted sync file is stored; swapped for an in-memory one in tests. */
export interface SyncTransport {
  /** The current file and its version tag, or null when there is no sync file yet. */
  get(): Promise<{ text: string; etag: string } | null>;
  /** Write the file only if it is still at version `etag` (null: only if it doesn't exist yet). */
  put(text: string, etag: string | null): Promise<{ etag: string } | 'conflict'>;
  remove(): Promise<void>;
}

const GRAPH = 'https://graph.microsoft.com/v1.0/me/drive/special/approot:/planora-sync.json';
/** OneDrive's limit for a simple upload; far above what a year of Planora data needs. */
export const MAX_SYNC_BYTES = 4 * 1024 * 1024;

export class SyncHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function oneDriveTransport(token: () => Promise<string>, fetchFn: typeof fetch = fetch): SyncTransport {
  const auth = async () => ({ Authorization: 'Bearer ' + (await token()) });
  return {
    async get() {
      const meta = await fetchFn(GRAPH, { headers: await auth() });
      if (meta.status === 404) return null;
      if (!meta.ok) throw new SyncHttpError(meta.status, 'onedrive-read');
      const item = (await meta.json()) as { eTag: string; '@microsoft.graph.downloadUrl'?: string };
      // The download address is pre-authorised and short-lived; it needs no token.
      const res = item['@microsoft.graph.downloadUrl']
        ? await fetchFn(item['@microsoft.graph.downloadUrl'])
        : await fetchFn(GRAPH + ':/content', { headers: await auth() });
      if (!res.ok) throw new SyncHttpError(res.status, 'onedrive-download');
      return { text: await res.text(), etag: item.eTag };
    },
    async put(text, etag) {
      if (new Blob([text]).size > MAX_SYNC_BYTES) throw new Error('sync-too-large');
      const res = await fetchFn(GRAPH + ':/content', {
        method: 'PUT',
        headers: { ...(await auth()), 'Content-Type': 'application/json', ...(etag ? { 'If-Match': etag } : { 'If-None-Match': '*' }) },
        body: text,
      });
      if (res.status === 412 || res.status === 409) return 'conflict';
      if (!res.ok) throw new SyncHttpError(res.status, 'onedrive-write');
      const item = (await res.json()) as { eTag: string };
      return { etag: item.eTag };
    },
    async remove() {
      const res = await fetchFn(GRAPH, { method: 'DELETE', headers: await auth() });
      if (!res.ok && res.status !== 404) throw new SyncHttpError(res.status, 'onedrive-delete');
    },
  };
}

/** A sync "server" in memory, behaving like OneDrive's version checks. For tests. */
export function memoryTransport(): SyncTransport & { file: { text: string; etag: string } | null } {
  let version = 0;
  const t = {
    file: null as { text: string; etag: string } | null,
    async get() {
      return t.file ? { ...t.file } : null;
    },
    async put(text: string, etag: string | null) {
      if (new Blob([text]).size > MAX_SYNC_BYTES) throw new Error('sync-too-large');
      if ((t.file?.etag ?? null) !== etag) return 'conflict' as const;
      t.file = { text, etag: 'v' + ++version };
      return { etag: t.file.etag };
    },
    async remove() {
      t.file = null;
    },
  };
  return t;
}
