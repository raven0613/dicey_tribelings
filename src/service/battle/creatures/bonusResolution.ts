import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import type { Equipment } from '../../../types/game';
import type { SkillEvent } from '../../../types/battle';
import type { ResolutionContext } from './resolutionContext';
import { splitInteger } from './splitInteger';
import { combatNumber } from './creatureState';

function equipmentBonus(c: ResolutionContext, equipment: Equipment, value: number, e = c.equipmentEvent(8, equipment)) {
  if (value <= 0) return;
  const id = `bonus-${c.bonusDice.length}`;
  c.bonusDice.push({ id, source: { kind: 'equipment', equipmentId: equipment.id }, sourceName: equipment.name,
    originalDamage: value, bonusDamage: value, label: equipment.name, description: `${equipment.name}：${Math.ceil(value)}` });
  e.bonusIds.push(id); c.log.change(e, { kind: 'bonus', targetId: id, before: 0, after: value });
}

export function monotoneRuns(items: { creature: string; baseValue: number }[]): number[][] {
  const runs: number[][] = [];
  let start = 0, direction = 0;
  const finish = (end: number) => { if (end - start + 1 >= eq.lineMinimum) runs.push(Array.from({ length: end - start + 1 }, (_, i) => start + i)); };
  for (let i = 1; i < items.length; i++) {
    const same = items[i].creature === items[i - 1].creature && items[i].creature !== 'blank';
    const next = same ? Math.sign(items[i].baseValue - items[i - 1].baseValue) : 0;
    if (!next) { finish(i - 1); start = i; direction = 0; }
    else if (direction && next !== direction) { finish(i - 1); start = i - 1; direction = next; }
    else direction = next;
  }
  finish(items.length - 1);
  return runs;
}

function generateEquipmentBonuses(c: ResolutionContext) {
  const drop = c.equipment.find(item => item.ruleId === 'REROLL_DROP');
  if (drop) for (const bonus of c.state.rerollBonuses) equipmentBonus(c, drop, bonus.damage);
  const coronation = c.equipment.find(item => item.ruleId === 'CORONATION');
  if (coronation && c.identityState.changes) {
    const e = c.equipmentEvent(8, coronation);
    for (let i = 0; i < c.identityState.changes * eq.coronationCount; i++) equipmentBonus(c, coronation, eq.coronationDamage, e);
  }
  const idle = c.equipment.find(item => item.ruleId === 'IDLE_BONUS');
  if (idle) for (const item of c.items.filter(item => item.finalDamage === 0)) equipmentBonus(c, idle, item.baseValue, c.equipmentEvent(8, idle, [item]));
  const line = c.equipment.find(item => item.ruleId === 'LINE_PRODUCT');
  if (line) for (const run of monotoneRuns(c.items)) {
    const items = run.map(index => c.items[index]);
    equipmentBonus(c, line, items.reduce((product, item) => product * item.baseValue, 1), c.equipmentEvent(8, line, items));
  }
}

function processBatch(c: ResolutionContext) {
  const original = c.bonusDice.filter(item => !c.batchState.processed.has(item.id));
  if (!original.length) return;
  const low = c.equipment.find(item => item.ruleId === 'LOW_SPLIT');
  const first = c.equipment.find(item => item.ruleId === 'FIRST_BONUS');
  if (first && !c.batchState.firstUsed) {
    const firstId = original[0].id;
    const source = c.events.find(event => event.bonusIds.includes(firstId))!;
    const firstBatch = original.filter(item => source.bonusIds.includes(item.id));
    c.batchState.firstUsed = true;
    const e = c.equipmentEvent(8, first);
    for (const _ of firstBatch) equipmentBonus(c, first, eq.firstBonusDamage, e);
  }
  if (low) {
    const eligible = c.bonusDice.filter(item => !c.batchState.processed.has(item.id) && (item.originalDamage ?? item.bonusDamage) <= eq.lowBonusThreshold);
    const e = c.equipmentEvent(8, low);
    for (const _ of eligible) equipmentBonus(c, low, eq.lowBonusDamage, e);
  }
  const batch = c.bonusDice.filter(item => !c.batchState.processed.has(item.id));
  const drum = c.equipment.find(item => item.ruleId === 'RESONATOR');
  const boost = (e: SkillEvent, amount: number) => {
    for (const bonus of batch) {
      const before = bonus.bonusDamage;
      bonus.bonusDamage = combatNumber(before + amount);
      c.log.change(e, { kind: 'bonus', targetId: bonus.id, before, after: bonus.bonusDamage });
    }
  };
  if (drum) boost(c.equipmentEvent(8, drum), eq.bonusDamage);
  for (const herald of c.items.filter(item => item.creature === 'herald')) {
    herald.skillInputs.count = (herald.skillInputs.count ?? 0) + batch.length;
    const e = c.event(9, herald, undefined, c.items);
    const replay = c.echoEvent(e);
    herald.skillInputs.value = (herald.skillInputs.value ?? 0) + batch.length * b.herald.bonusPerAttack * (replay ? 2 : 1);
    for (const pass of replay ? [e, replay] : [e]) boost(pass, b.herald.bonusDiceDamage);
    for (const item of c.items) c.attack(e, item, item.finalDamage + batch.length * b.herald.bonusPerAttack, undefined, true);
  }
  for (const bonus of batch) c.batchState.processed.add(bonus.id);
}

export function resolveBonusConversion(c: ResolutionContext) {
  for (const herald of c.items.filter(item => item.creature === 'herald')) herald.skillInputs = { count: 0, value: 0 };
  const shield = c.items.reduce((sum, item) => sum + item.shieldGranted, c.teamShield.value);
  for (const item of c.items.filter(item => item.creature === 'bulwark')) {
    item.skillInputs = { value: shield, count: c.teamShield.events };
    c.bonus(c.event(8, item), item, shield + c.teamShield.events * item.baseValue);
  }
  generateEquipmentBonuses(c);
  processBatch(c);
  const reserve = c.equipment.find(item => item.ruleId === 'RESERVE');
  if (reserve && c.battle.control > 0 && c.items.length) {
    const target = c.items.reduce((best, item) => item.finalDamage > best.finalDamage ? item : best);
    c.attack(c.equipmentEvent(9, reserve, [target]), target, target.finalDamage + c.battle.control * eq.reserveDamage);
  }
  const absorb = c.equipment.find(item => item.ruleId === 'ABSORB');
  const target = c.items.find(item => item.diceId === c.state.absorbTarget);
  if (absorb && target) {
    const e = c.equipmentEvent(9, absorb, [target]);
    e.bonusMotion = { kind: 'absorb', diceId: target.diceId };
    const damage = c.bonusDice.reduce((sum, bonus) => sum + bonus.bonusDamage, 0);
    for (const bonus of c.bonusDice) {
      c.log.change(e, { kind: 'bonus', targetId: bonus.id, before: bonus.bonusDamage, after: 0 });
      bonus.bonusDamage = 0; bonus.absorbed = true;
    }
    c.attack(e, target, target.finalDamage + damage);
  }
  const split = c.equipment.find(item => item.ruleId === 'SPLIT');
  if (split && c.state.splitEnabled && c.items.some(item => item.finalDamage > 0)) {
    const highest = c.items.reduce((best, item) => item.finalDamage > best.finalDamage ? item : best);
    const e = c.equipmentEvent(9, split, [highest]);
    e.bonusMotion = { kind: 'split', diceId: highest.diceId };
    const values = splitInteger(highest.finalDamage, eq.splitParts);
    c.attack(e, highest, 0); highest.attackTransferred = true;
    for (const value of values) equipmentBonus(c, split, value, e);
    processBatch(c);
  }
}
