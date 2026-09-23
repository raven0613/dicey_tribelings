import { combatOf } from './snapshot';
import { DAMAGE_SOURCE_LABELS } from '../../configs/telemetryConfig';
import type { BattleRecord, TelemetryState, RoundRecord } from './types';

export function startRound(state: TelemetryState, now: number): RoundRecord {
  return { round: state.creatureBattleState.round, startedAt: now, endedAt: null, rerolls: 0, settled: false,
    output: 0, damageHp: 0, damageShield: 0, takenHp: 0, absorbed: 0, healing: 0,
    bonusAttacks: 0, repeatAttacks: 0, skills: [], before: combatOf(state), after: null };
}

export function finishRound(battle: BattleRecord, state: TelemetryState, now: number) {
  const round = battle.rounds.at(-1);
  if (!round || round.endedAt !== null) return;
  round.endedAt = now;
  round.after = combatOf(state);
}

/** Reads committed deltas, including impact updates; identical animation updates contribute zero. */
export function updateBattle(battle: BattleRecord, state: TelemetryState, previous: TelemetryState, now: number): boolean {
  let changed = false;
  if (state.creatureBattleState.round > previous.creatureBattleState.round) {
    finishRound(battle, previous, now);
    battle.rounds.push(startRound(state, now));
    changed = true;
  }
  const round = battle.rounds.at(-1);
  if (!round || round.endedAt !== null) return changed;
  const rerolls = state.creatureBattleState.round === previous.creatureBattleState.round
    ? Math.max(0, state.creatureBattleState.rerollCount - previous.creatureBattleState.rerollCount) : 0;
  round.rerolls += rerolls;
  battle.rerolls += rerolls;
  changed ||= rerolls > 0;
  if (state.combatPhase === 'RESOLVING_CALCULATION' && previous.combatPhase !== state.combatPhase && previous.comboSummary) {
    const summary = previous.comboSummary;
    round.before = combatOf(previous);
    round.settled = true;
    round.output = summary.totalDamage;
    round.bonusAttacks = summary.bonusDice.length;
    round.repeatAttacks = summary.repeatAttacks.length;
    round.skills = structuredClone(summary.events.filter((event) => event.activated));
    changed = true;
  }
  const terminal = state.combatPhase === 'VICTORY' || state.combatPhase === 'DEFEAT';
  if (!terminal && state.creatureBattleState.round === previous.creatureBattleState.round) {
    const loss = (before: number, after: number) => Math.max(0, before - after);
    const hpLoss = loss(previous.playerHp, state.playerHp);
    const shieldLoss = loss(previous.playerShield, state.playerShield);
    const healing = loss(state.playerHp, previous.playerHp);
    const attackImpact = state.combatImpact !== previous.combatImpact && state.combatImpact
      && state.combatImpact.kind !== 'enemy';
    const enemyHpLoss = attackImpact ? loss(previous.currentEnemy?.hp ?? 0, state.currentEnemy?.hp ?? 0) : 0;
    const enemyShieldLoss = attackImpact ? loss(previous.currentEnemy?.shield ?? 0, state.currentEnemy?.shield ?? 0) : 0;
    round.takenHp += hpLoss;
    round.absorbed += shieldLoss;
    round.healing += healing;
    round.damageHp += enemyHpLoss;
    round.damageShield += enemyShieldLoss;
    changed ||= hpLoss + shieldLoss + healing + enemyHpLoss + enemyShieldLoss > 0;
    if (previous.playerHp > 0 && state.playerHp <= 0) {
      const enemy = previous.currentEnemy;
      const intent = enemy?.intents[enemy.currentIntentIndex]?.name ?? '';
      battle.death = { phase: previous.combatPhase, intent,
        source: DAMAGE_SOURCE_LABELS[state.combatImpact?.source ?? 'intent'],
        beforeHit: combatOf(previous), afterHit: combatOf(state) };
    }
  }
  return changed;
}
