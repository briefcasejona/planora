import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PlanoraDB } from './db';
import { repo, setEncryptionKey, setRequireKey, useDatabase } from './repo';
import { createCryptoConfig, unlock } from './crypto';
import { makeTask } from '../domain/testUtils';

describe('repo with encryption', () => {
  let db: PlanoraDB;
  beforeEach(() => {
    db = new PlanoraDB('test-' + Math.random());
    useDatabase(db);
    setEncryptionKey(null);
    setRequireKey(false);
  });

  it('refuses to write anything while encryption is on but locked', async () => {
    const { key } = await createCryptoConfig('pw-12345678');
    await repo.reencodeAll(key);
    setEncryptionKey(null);
    await expect(repo.putTasks([makeTask({ title: 'Lek' })])).rejects.toThrow('locked');
    await expect(repo.putSessions([{ id: 's', taskId: 't', start: '', end: '', status: 'planned', kind: 'work', locked: false }])).rejects.toThrow('locked');
    expect(await db.tasks.count()).toBe(0);
  });

  it('stores titles encrypted and reads them back with the key', async () => {
    const { config, key } = await createCryptoConfig('correct horse');
    setEncryptionKey(key);
    const task = makeTask({ title: 'Geheime toets', subject: 'Biologie' });
    await repo.putTasks([task]);
    const raw = await db.tasks.get(task.id);
    expect(JSON.stringify(raw)).not.toContain('Geheime');
    expect(JSON.stringify(raw)).not.toContain('Biologie');
    expect(raw?.deadline).toBe(task.deadline);
    expect((await repo.listTasks())[0].title).toBe('Geheime toets');

    setEncryptionKey(null);
    await expect(repo.listTasks()).rejects.toThrow('locked');
    expect(await unlock('wrong', config)).toBeNull();
    setEncryptionKey(await unlock('correct horse', config));
    expect((await repo.listTasks())[0].subject).toBe('Biologie');
  });

  it('turns encryption on and off for existing data', async () => {
    const task = makeTask({ title: 'Essay' });
    await repo.putTasks([task]);
    const { key } = await createCryptoConfig('pw');
    await repo.reencodeAll(key);
    expect(JSON.stringify(await db.tasks.get(task.id))).not.toContain('Essay');
    await repo.reencodeAll(null);
    expect((await db.tasks.get(task.id))?.title).toBe('Essay');
  });

  it('wipes everything', async () => {
    await repo.putTasks([makeTask()]);
    await repo.setKv('x', 1);
    await repo.wipeAll();
    expect(await repo.listTasks()).toEqual([]);
    expect(await repo.getKv('x', null)).toBeNull();
  });
});
