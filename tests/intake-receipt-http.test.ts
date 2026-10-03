import { it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { initDb } from '../src/db.js';
import routes from '../src/routes/intake.js';
import { mintToken } from '../src/utils/token-mint.js';
import { createDraft } from '../src/intake/draft.js';

it('receipt JSON requires owner/admin and public HTML requires submission', async () => {
  const db = initDb(':memory:');
  const owner = mintToken(db, { contributorName: 'Owner', createIfMissing: true });
  const other = mintToken(db, { contributorName: 'Other', createIfMissing: true });
  const admin = mintToken(db, { contributorName: 'Admin', createIfMissing: true, scope: 'admin' });
  const ownerId = (db.prepare("SELECT id FROM contributors WHERE name='Owner'").get() as any).id;
  const draft = createDraft(db, ownerId, 'https://example.com/');
  const app = express(); app.use(routes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const json = `/api/intake/batches/${draft.id}`;
  const get = (path: string, token?: string) => fetch(base + path, { headers: token ? { authorization: `Bearer ${token}` } : {} });
  try {
    assert.equal((await get(json)).status, 401);
    assert.equal((await get(json, owner.raw_token)).status, 404);
    assert.equal((await get(`/batch/${draft.id}`)).status, 404);
    db.prepare("UPDATE drafts SET status='submitted', submitted_at='2026-09-20T00:00:00Z' WHERE id=?").run(draft.id);
    assert.equal((await get(json, other.raw_token)).status, 403);
    assert.equal((await get(json, owner.raw_token)).status, 200);
    assert.equal((await get(json, admin.raw_token)).status, 200);
    assert.equal((await get(`/batch/${draft.id}`)).status, 200);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve()));
    db.close();
  }
});
