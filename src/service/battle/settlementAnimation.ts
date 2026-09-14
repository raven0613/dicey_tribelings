import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { BattleComboSummary, NumberDisplay, SkillChange, SkillEvent } from '../../types/battle';
import type { DamagePop } from '../../types/game';
import type { BattleStoreMethods } from './battleSettlement';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { soundService } from '../audio/soundService';
import { ceilDamage } from './damageValue';
import { combatNumber } from './creatures/creatureState';

export const waitForAnimation = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const still = (value: number): NumberDisplay => ({ displayValue: value, scale: 1, isSpinning: false, isLocked: true, isBuffed: false });

function scheduleSkills(events: SkillEvent[]) {
  let stage = -1;
  let stageStart = 0;
  let lastStart = -timing.eventGapMs;
  const occupied = new Map<string, number>();
  return events.map((event) => {
    if (event.stage !== stage) { stageStart = lastStart + timing.eventGapMs; stage = event.stage; }
    const keys = [event.sourceDiceId ?? event.equipmentId ?? event.id,
      ...event.changes.map((change) => `${change.kind}:${change.targetId}`),
      ...event.identities.map((item) => `identity:${item.diceId}`)];
    const start = Math.max(stageStart, ...keys.map((key) => occupied.get(key) ?? 0));
    keys.forEach((key) => occupied.set(key, start + timing.eventGapMs));
    lastStart = Math.max(lastStart, start);
    return { event, start };
  });
}

interface NumberTween { change: SkillChange; from: number; scale: number; start: number }

export async function animateCalculatedNumbers(methods: BattleStoreMethods, summary: BattleComboSummary,
  initialShield: number, initialFood: Record<string, number>) {
  const { get, set } = methods;
  const schedule = scheduleSkills(summary.events);
  const diceIndex = new Map(summary.items.map((item, index) => [item.diceId, index]));
  const dice = Object.fromEntries(summary.items.map((item, index) => [index, still(ceilDamage(item.rolledBaseValue))]));
  const bonuses: Record<string, NumberDisplay> = {};
  const shields = Object.fromEntries(summary.items.map((item) => [item.diceId, still(0)]));
  const food = Object.fromEntries(summary.items.map((item) => [item.diceId, still(initialFood[item.diceId] ?? 0)]));
  const identities = Object.fromEntries(summary.items.map((item) => [item.diceId, { creature: item.rolledCreature, tags: [...CREATURE_CONFIG[item.rolledCreature].tags] }]));
  const active = new Map<string, NumberTween>();
  const visible = new Set<string>();
  const launched = new Set<string>();
  const numbered = new Set<string>();
  const nameLifetime = timing.nameDelayMs + timing.nameFadeInMs + timing.nameHoldMs + timing.nameFadeOutMs;
  const duration = schedule.length ? Math.max(...schedule.map((entry) => entry.start)) + nameLifetime : 0;
  const valueFor = (change: SkillChange) => {
    if (change.kind === 'attack') return dice[diceIndex.get(change.targetId)!];
    if (change.kind === 'shield') return shields[change.targetId];
    if (change.kind === 'food') return food[change.targetId] ??= still(change.before);
    return bonuses[change.targetId] ??= still(0);
  };
  set({ diceSlotStates: dice, bonusSlotStates: {}, displayedShields: shields, displayedFood: food,
    displayedIdentities: identities, playerShieldDisplay: initialShield, skillFeedback: [], visibleBonusIds: [] });
  for (let elapsed = 0; elapsed <= duration + timing.frameMs; elapsed += timing.frameMs) {
    if (get().combatPhase !== 'RESOLVING_CALCULATION' || get().comboSummary !== summary) return;
    for (const { event, start } of schedule) {
      if (elapsed >= start && !launched.has(event.id)) {
        launched.add(event.id);
        const feedback = { event, startedAt: performance.now() };
        set({ skillFeedback: [...get().skillFeedback, feedback] });
        soundService.playSkillPulse(event.participantDiceIds.length > 2 || event.bonusIds.length > 0);
      }
      if (elapsed >= start + timing.nameDelayMs + timing.nameFadeInMs && !numbered.has(event.id)) {
        numbered.add(event.id);
        event.identities.forEach((item) => { identities[item.diceId] = { creature: item.creature, tags: item.tags }; });
        event.bonusIds.forEach((id) => visible.add(id));
        for (const change of event.changes) {
          const display = valueFor(change);
          active.set(`${change.kind}:${change.targetId}`, { change, from: display.displayValue, scale: display.scale, start: elapsed });
        }
      }
    }
    let settled = false;
    for (const [key, tween] of active) {
      const { change } = tween;
      const progress = Math.min(1, (elapsed - tween.start) / timing.numberDurationMs);
      const eased = 1 - (1 - progress) ** 3;
      const display = valueFor(change);
      const attackValue = change.kind === 'attack' || change.kind === 'bonus';
      const target = attackValue ? ceilDamage(change.after) : change.after;
      const interpolated = tween.from + (target - tween.from) * eased;
      display.displayValue = attackValue ? Math.round(interpolated) : combatNumber(interpolated);
      const peak = Math.abs(change.after - change.before) >= timing.heavyDamage ? timing.numberScaleLarge : timing.numberScaleSmall;
      display.scale = progress < 0.3 ? tween.scale + (peak - tween.scale) * (progress / 0.3)
        : peak + (1 - peak) * (1 - (1 - (progress - 0.3) / 0.7) ** 2);
      display.isSpinning = progress < 1; display.isLocked = progress === 1;
      display.isBuffed = change.after > change.before;
      if (progress === 1) { active.delete(key); settled = true; }
    }
    if (active.size && elapsed % (timing.frameMs * 4) === 0) soundService.playNumberRoll();
    if (settled) soundService.playNumberSettle();
    const copy = <T extends string | number>(values: Record<T, NumberDisplay>) =>
      Object.fromEntries(Object.entries<NumberDisplay>(values).map(([key, value]) => [key, { ...value }])) as Record<T, NumberDisplay>;
    set({ diceSlotStates: copy(dice), bonusSlotStates: copy(bonuses), displayedShields: copy(shields), displayedFood: copy(food),
      displayedIdentities: { ...identities }, visibleBonusIds: [...visible],
      playerShieldDisplay: combatNumber(initialShield + Object.values(shields).reduce((sum, value) => sum + value.displayValue, 0)),
      skillFeedback: get().skillFeedback.filter((feedback) => performance.now() - feedback.startedAt < nameLifetime) });
    await waitForAnimation(timing.frameMs);
  }
  if (get().combatPhase !== 'RESOLVING_CALCULATION' || get().comboSummary !== summary) return;
  set({ diceSlotStates: Object.fromEntries(summary.items.map((item, index) => [index, { ...still(ceilDamage(item.finalDamage)), isBuffed: item.finalDamage > item.rolledBaseValue }])),
    bonusSlotStates: Object.fromEntries(summary.bonusDice.map((bonus) => [bonus.id, still(ceilDamage(bonus.bonusDamage))])),
    visibleBonusIds: summary.bonusDice.map((bonus) => bonus.id), playerShieldDisplay: null, skillFeedback: [] });
}

export async function animateAttack(methods: BattleStoreMethods, index: number, bonus: boolean,
  pop: Omit<DamagePop, 'id'>, applyDamage: () => void, isCurrent = () => true, strength = 0) {
  const { set, triggerScreenShake, addDamagePop, waitForAttackMotion } = methods;
  if (!isCurrent()) return false;
  const heavy = strength > 0;
  set({ attackingDieIndex: bonus ? null : index, attackingBonusIndex: bonus ? index : null,
    attackingStage: 'windup', attackEmphasis: strength });
  if (!await waitForAttackMotion(index, bonus, isCurrent) || !isCurrent()) return false;
  soundService.playDiceDash(); set({ attackingStage: 'dash' });
  if (!await waitForAttackMotion(index, bonus, isCurrent) || !isCurrent()) return false;
  soundService.playEnemyHit(heavy); triggerScreenShake(timing.lightShake + (timing.heavyShake - timing.lightShake) * strength);
  applyDamage(); addDamagePop(pop); set({ attackingStage: 'impact' });
  if (!await waitForAttackMotion(index, bonus, isCurrent) || !isCurrent()) return false;
  set({ attackingStage: 'recoil' });
  if (!await waitForAttackMotion(index, bonus, isCurrent) || !isCurrent()) return false;
  set({ attackingDieIndex: null, attackingBonusIndex: null, attackingStage: 'idle', attackEmphasis: 0 });
  await waitForAnimation(timing.betweenAttackMs);
  return isCurrent();
}
