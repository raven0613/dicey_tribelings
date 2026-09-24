import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { BattleComboSummary, NumberDisplay, SkillChange, SkillEvent, SkillFeedback } from '../../types/battle';
import type { GameState } from '../../store/gameStore.types';
import type { DamagePopInput } from '../../types/game';
import type { BattleStoreMethods } from './battleSettlement';
import { BATTLE_PRESENTATION as timing } from '../../configs/battleConfig';
import { soundService } from '../audio/soundService';
import { ceilDamage } from './damageValue';
import { combatNumber } from './creatures/creatureState';
import { getNumberDuration } from './presentation/numberFeedback';
import { createNumberTimeline } from './presentation/numberTimeline';

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

export async function animateCalculatedNumbers(methods: BattleStoreMethods, summary: BattleComboSummary,
  initialShield: number, initialFood: Record<string, number>) {
  const { get, set } = methods;
  const schedule = scheduleSkills(summary.events);
  let displayedHp = get().playerHpDisplay ?? get().playerHp;
  const diceIndex = new Map(summary.items.map((item, index) => [item.diceId, index]));
  let dice = Object.fromEntries(summary.items.map((item, index) => [index, still(ceilDamage(item.rolledBaseValue))]));
  let bonuses: Record<string, NumberDisplay> = {};
  let shields = Object.fromEntries(summary.items.map((item) => [item.diceId, still(0)]));
  let food = Object.fromEntries(summary.items.map((item) => [item.diceId, still(initialFood[item.diceId] ?? 0)]));
  let identities = Object.fromEntries(summary.items.map((item) => [item.diceId, { creature: item.rolledCreature, tags: [...CREATURE_CONFIG[item.rolledCreature].tags] }]));
  const active = createNumberTimeline();
  let visible: string[] = [];
  let feedback: SkillFeedback[] = [];
  const nameLifetime = timing.nameDelayMs + timing.nameFadeInMs + timing.nameHoldMs + timing.nameFadeOutMs;
  const numberDelay = timing.nameDelayMs + timing.nameFadeInMs;
  const duration = schedule.length ? Math.max(...schedule.map((entry) => entry.start))
    + Math.max(nameLifetime, numberDelay + Math.max(0, ...summary.events.flatMap(event => event.changes.map(getNumberDuration)))) : 0;
  const timeline = schedule.flatMap(({ event, start }) => [
    { event, time: start, numbers: false }, { event, time: start + numberDelay, numbers: true },
  ]).sort((a, b) => a.time - b.time);
  const valueFor = (change: SkillChange) => {
    if (change.kind === 'attack') return dice[diceIndex.get(change.targetId)!];
    if (change.kind === 'shield') return shields[change.targetId] ?? still(change.before);
    if (change.kind === 'food') return food[change.targetId] ?? still(change.before);
    return bonuses[change.targetId] ?? still(0);
  };
  const writeValue = (change: SkillChange, value: NumberDisplay) => {
    const previous = valueFor(change);
    if (previous.displayValue === value.displayValue && previous.scale === value.scale && previous.fontSize === value.fontSize
      && previous.isSpinning === value.isSpinning && previous.isLocked === value.isLocked
      && previous.isBuffed === value.isBuffed && previous.pending === value.pending) return;
    if (change.kind === 'attack') dice = { ...dice, [diceIndex.get(change.targetId)!]: value };
    else if (change.kind === 'shield') shields = { ...shields, [change.targetId]: value };
    else if (change.kind === 'food') food = { ...food, [change.targetId]: value };
    else bonuses = { ...bonuses, [change.targetId]: value };
  };
  const advanceNumbers = (elapsed: number) => active.advance(elapsed, writeValue);
  set({ diceSlotStates: dice, bonusSlotStates: bonuses, displayedShields: shields, displayedFood: food,
    displayedIdentities: identities, playerShieldDisplay: initialShield, skillFeedback: feedback, visibleBonusIds: visible });
  const startedAt = performance.now();
  let elapsed = 0, cursor = 0, lastRollSound = -timing.numberSoundIntervalMs;
  while (true) {
    if (get().combatPhase !== 'RESOLVING_CALCULATION' || get().comboSummary !== summary) return;
    let settled = false;
    while (cursor < timeline.length && timeline[cursor].time <= elapsed) {
      const { event, time, numbers } = timeline[cursor++];
      // Advance to each scheduled onset before replacing a tween, including across missed frames.
      settled = advanceNumbers(time) || settled;
      if (!numbers) {
        feedback = [...feedback, { event, startedAt: startedAt + time }];
        soundService.playSkillPulse(event.participantDiceIds.length > 2 || event.bonusIds.length > 0);
        continue;
      }
      if (event.healing) displayedHp = Math.min(get().maxHp, displayedHp + event.healing);
      for (const item of event.identities) {
        identities = { ...identities, [item.diceId]: { creature: item.creature, tags: item.tags } };
      }
      const newIds = event.bonusIds.filter((id) => !visible.includes(id));
      if (newIds.length) visible = [...visible, ...newIds];
      for (const id of newIds) if (!event.changes.some((change) => change.kind === 'bonus' && change.targetId === id)) bonuses = { ...bonuses, [id]: { ...still(0), pending: true } };
      for (const change of event.changes) {
        if (change.kind === 'bonus' && bonuses[change.targetId]?.pending && event.skill !== 'cheerleader') continue;
        const display = valueFor(change);
        active.start(change, display, time);
      }
    }
    settled = advanceNumbers(elapsed) || settled;
    if (active.size && elapsed - lastRollSound >= timing.numberSoundIntervalMs) {
      soundService.playNumberRoll(); lastRollSound = elapsed;
    }
    if (settled) soundService.playNumberSettle();
    if (feedback.some((item) => startedAt + elapsed - item.startedAt >= nameLifetime)) {
      feedback = feedback.filter((item) => startedAt + elapsed - item.startedAt < nameLifetime);
    }
    const shieldDisplays = Object.values(shields);
    const totalShield = combatNumber(initialShield + shieldDisplays.reduce((sum, value) => sum + value.displayValue, 0));
    const frame: Partial<GameState> = { diceSlotStates: dice, bonusSlotStates: bonuses,
      displayedShields: shields, displayedFood: food, displayedIdentities: identities, visibleBonusIds: visible,
      playerHpDisplay: displayedHp,
      playerShieldDisplay: shieldDisplays.some((display) => display.isSpinning) ? Math.floor(totalShield) : totalShield,
      skillFeedback: feedback };
    const current = get();
    if (Object.keys(frame).some((key) => frame[key as keyof GameState] !== current[key as keyof GameState])) set(frame);
    if (elapsed >= duration) break;
    elapsed = await new Promise<number>((resolve) => requestAnimationFrame((now) => resolve(now - startedAt)));
  }
  if (get().combatPhase !== 'RESOLVING_CALCULATION' || get().comboSummary !== summary) return;
  set({ diceSlotStates: Object.fromEntries(summary.items.map((item, index) => [index, { ...still(ceilDamage(item.finalDamage)), isBuffed: item.finalDamage > item.rolledBaseValue }])),
    bonusSlotStates: Object.fromEntries(summary.bonusDice.map((bonus) => [bonus.id, still(ceilDamage(bonus.bonusDamage))])),
    visibleBonusIds: summary.bonusDice.map((bonus) => bonus.id), playerShieldDisplay: null, playerHpDisplay: null, skillFeedback: [] });
}

export async function animateAttack(methods: BattleStoreMethods, index: number, bonus: boolean,
  pop: DamagePopInput, applyDamage: () => void, isCurrent = () => true, strength = 0) {
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
