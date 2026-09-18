import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

export function resolveRobbery(c: ResolutionContext) {
  const stolen = new Set<string>();
  const zeroed = new Set<string>();
  let captures = 0;
  for (const [index, source] of c.items.entries()) {
    if (source.creature !== 'boss' && source.creature !== 'bully') continue;
    const candidates = source.creature === 'boss'
      ? c.items.filter((item) => item.diceId !== source.diceId && item.tags.includes('common')
        && item.finalDamage > 0 && !stolen.has(item.diceId))
      : c.neighbors(index).filter((item) => item.creature !== 'food' && item.finalDamage > 0);
    const target = choose(candidates, c.state.seed, `steal:${source.diceId}`);
    source.skillInputs = { count: candidates.length };
    if (!target) continue;
    const craftsman = target.tags.includes('craftsman');
    const e = c.event(6, source, source.creature === 'bully' && craftsman ? '保護費MAX' : undefined, [target], 'robbery');
    const removed = combatNumber(target.finalDamage * (source.creature === 'boss' ? 1 : b.bully.stolenFraction));
    const multiplier = source.creature === 'boss' ? b.boss.multiplier : craftsman ? b.bully.craftsmanMultiplier : b.bully.multiplier;
    c.attack(e, target, target.finalDamage - removed);
    c.attack(e, source, source.finalDamage + removed * multiplier);
    if (source.creature === 'boss') stolen.add(target.diceId);
    if (target.finalDamage === 0) zeroed.add(target.diceId);
    captures++;
  }
  const robberyIds = new Set(c.events.filter((event) => event.relation === 'robbery').flatMap((event) => event.participantDiceIds));
  for (const thief of c.items.filter((item) => item.creature === 'thief')) {
    thief.skillInputs = { count: captures, blockedByRobbery: zeroed.has(thief.diceId) };
    if (captures > 0 && !thief.skillInputs.blockedByRobbery) {
      c.bonus(c.event(7, thief, undefined, c.items.filter((item) => robberyIds.has(item.diceId))), thief, thief.baseValue);
    }
  }
  return captures;
}

export function resolveFinalAttacks(c: ResolutionContext) {
  const shield = combatNumber(c.items.reduce((sum, item) => sum + item.shieldGranted, c.teamShield.value));
  for (const bulwark of c.items.filter((item) => item.creature === 'bulwark')) {
    bulwark.skillInputs = { value: shield };
    c.bonus(c.event(8, bulwark, undefined, c.items.filter((item) => item.shieldGranted > 0)), bulwark, shield);
  }
  const resonator = c.equipment.find((item) => item.ruleId === 'RESONATOR');
  if (resonator && c.bonusDice.length > 0) {
    const e = c.equipmentEvent(8, resonator);
    for (const bonus of c.bonusDice) {
      const before = bonus.bonusDamage;
      bonus.bonusDamage = combatNumber(before + eq.bonusDamage);
      e.changes.push({ kind: 'bonus', targetId: bonus.id, before, after: bonus.bonusDamage });
    }
  }
  for (const herald of c.items.filter((item) => item.creature === 'herald')) {
    herald.skillInputs = { count: c.bonusDice.length };
    if (!c.bonusDice.length) continue;
    const e = c.event(9, herald, undefined, c.items);
    for (const item of c.items) c.attack(e, item, item.finalDamage + c.bonusDice.length * b.herald.bonusPerAttack);
  }
  const reserve = c.equipment.find((item) => item.ruleId === 'RESERVE');
  if (reserve && c.battle.control > 0 && c.items.length > 0) {
    const target = c.items.reduce((best, item) => item.finalDamage > best.finalDamage ? item : best);
    const e = c.equipmentEvent(9, reserve, [target]);
    c.attack(e, target, target.finalDamage + c.battle.control * eq.reserveDamage);
  }
  const frugal = c.equipment.find((item) => item.ruleId === 'FRUGAL');
  if (frugal && c.state.controlSpent === 0 && !c.state.paidRerollUsed) {
    const e = c.equipmentEvent(9, frugal);
    for (const item of c.items) c.attack(e, item, item.finalDamage * eq.frugalMultiplier, `×${eq.frugalMultiplier}`);
    for (const bonus of c.bonusDice) {
      const before = bonus.bonusDamage;
      bonus.bonusDamage = combatNumber(before * eq.frugalMultiplier);
      e.changes.push({ kind: 'bonus', targetId: bonus.id, before, after: bonus.bonusDamage });
    }
  }
  for (const princess of c.items.filter((item) => item.creature === 'princess')) {
    const targets = c.items.filter((item) => item.diceId !== princess.diceId && item.tags.includes('noble') && item.finalDamage > 0);
    princess.skillInputs = { count: targets.length };
    if (!targets.length) continue;
    const e = c.event(10, princess, undefined, targets, 'attack');
    const copies = c.echoMultiplier(e);
    for (let copy = 0; copy < copies; copy++) for (const target of targets) {
      c.repeatAttacks.push({ diceId: target.diceId, damage: target.finalDamage, sourceDiceId: princess.diceId });
      e.repeatDiceIds.push(target.diceId);
      target.bonusTags.push('公主命令：再攻擊');
    }
  }
}
