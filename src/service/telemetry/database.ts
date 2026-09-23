import Dexie, { type Table } from 'dexie';
import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { expiredRunIds } from './analytics';
import type { RunRecord } from './types';

export class TelemetryDatabase extends Dexie {
  runs!: Table<RunRecord, string>;

  constructor(name: string = TELEMETRY_CONFIG.databaseName) {
    super(name);
    this.version(TELEMETRY_CONFIG.schemaVersion).stores({ runs: 'id, startedAt' });
  }

  async save(record: RunRecord, create = false): Promise<void> {
    await this.transaction('rw', this.runs, async () => {
      if (!create && await this.runs.where('id').equals(record.id).count() === 0) return;
      await this.runs.put(record);
      const keys = await this.runs.orderBy('startedAt').keys();
      const ids = await this.runs.orderBy('startedAt').primaryKeys();
      const expired = expiredRunIds(ids.map((id, index) => ({ id, startedAt: Number(keys[index]) })));
      await this.runs.bulkDelete(expired);
    });
  }

  list(): Promise<RunRecord[]> {
    return this.runs.orderBy('startedAt').reverse().toArray();
  }

  async remove(ids: string[]): Promise<void> {
    await this.transaction('rw', this.runs, () => this.runs.bulkDelete(ids));
  }
}

export const telemetryDatabase = new TelemetryDatabase();
