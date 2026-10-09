import type { BusyBlock, FeedbackRecord, Preferences, Task, WeekReport, WorkSession } from '../domain/types';
import { createCryptoConfig, decryptJSON, deriveKey, type EncryptedBlob, encryptJSON } from './crypto';
import { repo } from './repo';

interface BackupPayload {
  tasks: Task[];
  sessions: WorkSession[];
  busy: BusyBlock[];
  feedback: FeedbackRecord[];
  reports: WeekReport[];
  prefs: Preferences;
}

interface BackupFile {
  app: 'planora';
  version: 1;
  createdAt: string;
  salt: string;
  data: EncryptedBlob;
}

/** Backups are always encrypted with a passphrase the user chooses for the file. */
export async function createBackup(passphrase: string): Promise<Blob> {
  const payload: BackupPayload = {
    tasks: await repo.listTasks(),
    sessions: await repo.listSessions(),
    // Busy time pulled from Microsoft/Google is not included; it can be re-synced.
    busy: (await repo.listBusy()).filter((b) => b.source === 'local' || b.source === 'ics'),
    feedback: await repo.listFeedback(),
    reports: await repo.listReports(),
    prefs: await repo.getPrefs(),
  };
  const { config, key } = await createCryptoConfig(passphrase);
  const file: BackupFile = {
    app: 'planora',
    version: 1,
    createdAt: new Date().toISOString(),
    salt: config.salt,
    data: await encryptJSON(key, payload),
  };
  return new Blob([JSON.stringify(file)], { type: 'application/json' });
}

export async function restoreBackup(text: string, passphrase: string): Promise<void> {
  const file = JSON.parse(text) as BackupFile;
  if (file.app !== 'planora' || file.version !== 1) throw new Error('invalid-file');
  let payload: BackupPayload;
  try {
    payload = await decryptJSON<BackupPayload>(await deriveKey(passphrase, file.salt), file.data);
  } catch {
    throw new Error('wrong-passphrase');
  }
  const keepCrypto = await repo.getCryptoConfig();
  await repo.wipeAll();
  if (keepCrypto) await repo.setKv('crypto', keepCrypto);
  await repo.putTasks(payload.tasks);
  await repo.putSessions(payload.sessions);
  await repo.putBusy(payload.busy);
  await repo.putFeedback(payload.feedback);
  await repo.putReports(payload.reports);
  await repo.savePrefs(payload.prefs);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
