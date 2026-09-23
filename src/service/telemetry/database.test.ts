import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { TelemetryDatabase } from './database';
import { exportDocument } from './export';
import type { RunRecord } from './types';

test('Dexie retains ten entire runs, deletes selected runs and exports detached versioned data', async () => {
  const db = new TelemetryDatabase('telemetry-core-test');
  try {
    for (let index = 0; index < TELEMETRY_CONFIG.maxRuns + 2; index++) {
      await db.save({ id: `run-${index}`, startedAt: index, snapshots: [{ id: index }], battles: [], result: 'incomplete' } as RunRecord, true);
    }
    const retained = await db.list();
    assert.equal(retained.length, TELEMETRY_CONFIG.maxRuns);
    assert.equal(await db.runs.get('run-0'), undefined);
    assert.equal(await db.runs.get('run-1'), undefined);
    const selected = retained.slice(0, 2);
    const document = exportDocument(selected, 123);
    assert.equal(document.schemaVersion, TELEMETRY_CONFIG.schemaVersion);
    assert.equal(document.exportedAt, 123);
    assert.equal(document.units.duration, 'milliseconds');
    assert.deepEqual(document.runs, selected.map((run) => ({ ...run, rerollSummary: { total: 0, average: 0, completed: 0 } })));
    selected[0].result = 'death';
    assert.equal(document.runs[0].result, 'incomplete');
    await db.remove(selected.map((run) => run.id));
    const remaining = await db.list();
    assert.equal(remaining.length, TELEMETRY_CONFIG.maxRuns - selected.length);
    assert.ok(remaining.every((run) => !selected.some((item) => item.id === run.id)));
    await db.save(selected[0]);
    assert.equal(await db.runs.get(selected[0].id), undefined, 'a queued update cannot recreate a deleted run');
  } finally {
    await db.delete();
  }
});
