import { TELEMETRY_CONFIG } from '../../configs/telemetryConfig';
import { CHAPTER_END_NODE } from '../../configs/regions/mapConfig';
import { buildChanged, buildOf, locationOf } from './snapshot';
import { finishRound, updateBattle } from './battleRecord';
import type { BattleRecord, BuildSnapshot, RunRecord, TelemetryState } from './types';

/** Owns a detached analytics record; gameplay state is read-only to this service. */
export class RunRecorder {
  readonly record: RunRecord;
  private lastTime: number;
  private active: boolean;

  constructor(id: string, state: TelemetryState, now: number, platform: string, active: boolean) {
    this.lastTime = now;
    this.active = active;
    this.record = { id, schemaVersion: TELEMETRY_CONFIG.schemaVersion, gameVersion: TELEMETRY_CONFIG.gameVersion,
      balanceVersion: TELEMETRY_CONFIG.balanceVersion, country: null, platform, content: { ...TELEMETRY_CONFIG.content },
      startedAt: now, updatedAt: now, endedAt: null, elapsedMs: 0, activeMs: 0, result: 'incomplete',
      location: locationOf(state), visits: [], snapshots: [], battles: [], equipmentHistory: [], milestones: [] };
    this.visit(state, now);
    this.snapshot(state, 'start', now);
    this.equipment(state, { ...state, equipments: [] }, now, '開局');
  }

  clock(now: number, active = this.active) {
    if (this.record.endedAt !== null) return;
    const delta = Math.max(0, now - this.lastTime);
    this.record.elapsedMs += delta;
    if (this.active) this.record.activeMs += delta;
    this.record.updatedAt = now;
    this.lastTime = now;
    this.active = active;
    for (const equipment of this.record.equipmentHistory) {
      if (equipment.removedAt === null) equipment.heldMs = this.record.activeMs - equipment.acquiredActiveMs;
    }
    const battle = this.currentBattle();
    if (battle) {
      battle.elapsedMs = Math.max(0, now - battle.startedAt);
      battle.activeMs = this.record.activeMs - battle.activeStartedMs;
    }
  }

  observe(state: TelemetryState, previous: TelemetryState, now: number): boolean {
    if (this.record.endedAt !== null) return false;
    this.clock(now);
    let changed = false;
    if (locationOf(state).nodeId !== this.record.location.nodeId) {
      this.visit(state, now);
      changed = true;
    }
    if (state.combatPhase === 'PREPARATION' && state.currentEnemy && !this.currentBattle()) {
      this.beginBattle(state, now);
      changed = true;
    }
    const battle = this.currentBattle();
    if (battle && previous.creatureBattleState.round === 0 && state.creatureBattleState.round === 1) {
      battle.startSnapshotId = this.snapshot(state, 'battle_start', now).id;
      changed = true;
    }
    if (battle) changed = updateBattle(battle, state, previous, now) || changed;
    const terminal = battle && (state.combatPhase === 'VICTORY' || state.combatPhase === 'DEFEAT')
      && state.combatPhase !== previous.combatPhase;
    if (terminal) {
      this.endBattle(battle, state, previous, now);
      return true;
    }
    if (buildChanged(state, previous)) {
      this.equipment(state, previous, now);
      this.snapshot(state, 'build', now);
      changed = true;
    }
    return changed;
  }

  finish(result: RunRecord['result'], state: TelemetryState, now: number) {
    if (this.record.endedAt !== null) return;
    this.clock(now);
    const battle = this.currentBattle();
    if (battle) {
      finishRound(battle, state, now);
      battle.endSnapshotId = this.snapshot(state, 'battle_end', now).id;
      battle.endedAt = now;
    }
    this.snapshot(state, 'end', now);
    this.record.result = result;
    this.record.endedAt = now;
  }

  private currentBattle() {
    const battle = this.record.battles.at(-1);
    return battle?.endedAt === null ? battle : undefined;
  }

  private snapshot(state: TelemetryState, reason: BuildSnapshot['reason'], now: number) {
    const snapshot = buildOf(state, { id: this.record.snapshots.length, at: now, reason,
      elapsedMs: this.record.elapsedMs, activeMs: this.record.activeMs });
    this.record.snapshots.push(snapshot);
    return snapshot;
  }

  private visit(state: TelemetryState, now: number) {
    this.record.location = locationOf(state);
    this.record.visits.push({ location: locationOf(state), at: now, activeMs: this.record.activeMs });
  }

  private equipment(state: TelemetryState, previous: TelemetryState, now: number, source?: string) {
    const added = state.equipments.filter((item) => !previous.equipments.some((old) => old.id === item.id));
    for (const held of this.record.equipmentHistory) {
      if (held.removedAt !== null || state.equipments.some((item) => item.id === held.equipmentId)) continue;
      held.removedAt = now;
      held.removedLocation = locationOf(state);
      held.replacementId = added[0]?.id ?? null;
    }
    for (const item of added) this.record.equipmentHistory.push({ equipmentId: item.id, name: item.name,
      source: source ?? (locationOf(state).type === 'shop' ? '商店' : locationOf(state).type === 'chest' ? '寶箱' : '其他取得'),
      acquiredAt: now, acquiredActiveMs: this.record.activeMs, acquiredLocation: locationOf(state),
      removedAt: null, removedLocation: null, replacementId: null, heldMs: 0, battles: 0 });
  }

  private beginBattle(state: TelemetryState, now: number) {
    const enemy = state.currentEnemy!;
    const snapshot = this.snapshot(state, 'preparation', now);
    this.record.battles.push({ id: this.record.battles.length, location: locationOf(state), enemyId: enemy.id,
      enemyName: enemy.name, startedAt: now, endedAt: null, elapsedMs: 0, activeMs: 0, activeStartedMs: this.record.activeMs,
      outcome: 'incomplete', startSnapshotId: snapshot.id, endSnapshotId: null, rerolls: 0, rounds: [], death: null });
    for (const item of this.record.equipmentHistory) if (item.removedAt === null) item.battles++;
  }

  private endBattle(battle: BattleRecord, state: TelemetryState, previous: TelemetryState, now: number) {
    finishRound(battle, previous, now);
    battle.endedAt = now;
    battle.outcome = state.combatPhase === 'VICTORY' ? 'victory' : state.playerHp <= 0 ? 'death' : 'round_limit';
    // Capture the effective battle build before victory/defeat restores temporary stickers and resources.
    battle.endSnapshotId = this.snapshot(previous, 'battle_end', now).id;
    if (battle.outcome !== 'victory') {
      this.finish(battle.outcome, previous, now);
      return;
    }
    if (state.currentEnemy?.isBoss) {
      const endState = { ...previous, playerHp: state.playerHp, gold: state.gold };
      const snapshot = this.snapshot(endState, 'milestone', now);
      const common = { at: now, elapsedMs: this.record.elapsedMs, activeMs: this.record.activeMs, snapshotId: snapshot.id };
      this.record.milestones.push({ ...common, kind: 'region', name: this.record.location.regionName });
      if (this.record.location.nodeId === CHAPTER_END_NODE) {
        this.record.milestones.push({ ...common, kind: 'chapter', name: this.record.content.chapterName },
          { ...common, kind: 'run', name: this.record.content.name });
        this.finish('victory', endState, now);
      }
    }
  }
}
