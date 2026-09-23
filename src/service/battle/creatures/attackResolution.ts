import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

export function resolveRobbery(c: ResolutionContext) {
  const stolen = new Set<string>();
  const culprits = new Set<string>();
  let captures = 0;
  for (const [index, source] of c.items.entries()) {
    if (source.creature !== 'boss' && source.creature !== 'bully') continue;
    const candidates = source.creature === 'boss'
      ? c.items.filter((item) => item.diceId !== source.diceId && item.tags.includes('common') && item.finalDamage > 0 && !stolen.has(item.diceId))
      : c.neighbors(index).filter((item) => !CREATURE_CONFIG[item.creature].tags.includes('food') && item.finalDamage > 0);
    const target = source.creature === 'boss' ? choose(candidates, c.state.seed, `steal:${source.diceId}`) : undefined;
    const targets = source.creature === 'boss' ? target ? [target] : [] : candidates;
    source.skillInputs = { count: captures, secondaryCount: targets.length };
    for (const victim of targets) {
      const craftsman = victim.tags.includes('craftsman');
      const e = c.event(6, source, source.creature === 'bully' && craftsman ? '保護費MAX' : undefined, [victim], 'robbery');
      const removed = combatNumber(victim.finalDamage * (source.creature === 'boss' ? 1 : b.bully.stolenFraction));
      if (removed <= 0) continue;
      captures++;
      const multiplier = source.creature === 'boss' ? b.boss.multipliers[Math.min(captures, b.boss.multipliers.length) - 1]
        : craftsman ? b.bully.craftsmanMultiplier : b.bully.multiplier;
      const gained = source.creature === 'boss' ? Math.ceil(removed * multiplier) : removed * multiplier;
      c.attack(e, victim, victim.finalDamage - removed);
      c.attack(e, source, source.finalDamage + gained);
      if (source.creature === 'boss') stolen.add(victim.diceId);
      culprits.add(source.diceId);
      source.skillInputs.count = captures;
    }
  }
  for (const thief of c.items.filter((item) => item.creature === 'thief')) {
    thief.skillInputs = { count: captures };
    if (captures) {
      const e = c.event(7, thief);
      for (let n = 0; n < captures; n++) c.bonus(e, thief, thief.baseValue);
    }
  }
  const detectives = c.items.filter((item) => item.creature === 'detective');
  const offenders = c.items.filter((item) => culprits.has(item.diceId));
  if (detectives.length && offenders.length) {
    const total = combatNumber(offenders.reduce((sum, item) => sum + item.finalDamage, 0) * b.detective.multiplier);
    const confiscation = c.event(7, detectives[0], undefined, offenders);
    for (const offender of offenders) c.attack(confiscation, offender, 0);
    const share = Math.floor(total / detectives.length);
    let remainder = combatNumber(total - share * detectives.length);
    for (const detective of detectives) {
      const extra = Math.min(1, remainder);
      remainder = combatNumber(remainder - extra);
      detective.skillInputs = { count: offenders.length, value: total };
      const e = c.event(7, detective, undefined, offenders);
      c.attack(e, detective, detective.finalDamage + share + extra);
    }
  }
  return captures;
}

export function resolveFinalAttacks(c: ResolutionContext) {
  const shield = combatNumber(c.items.reduce((sum, item) => sum + item.shieldGranted, c.teamShield.value));
  for (const bulwark of c.items.filter((item) => item.creature === 'bulwark')) {
    bulwark.skillInputs = { value: shield };
    const multiplier = shield >= b.bulwark.high ? b.bulwark.highMultiplier : shield >= b.bulwark.middle ? b.bulwark.multiplier : b.bulwark.lowMultiplier;
    c.bonus(c.event(8, bulwark, undefined, c.items.filter((item) => item.shieldGranted > 0)), bulwark, shield * multiplier);
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
    for (const item of c.items) c.attack(e, item, item.finalDamage + c.bonusDice.length * (c.bonusDice.length >= b.herald.threshold ? b.herald.highBonus : b.herald.bonusPerAttack));
    if (c.bonusDice.length >= b.herald.threshold) for (const bonus of c.bonusDice) {
      const before = bonus.bonusDamage;
      bonus.bonusDamage = combatNumber(before + b.herald.bonusDiceDamage * c.echoMultiplier(e));
      e.changes.push({ kind: 'bonus', targetId: bonus.id, before, after: bonus.bonusDamage });
    }
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
  for (const [id, opening] of c.pendingCheers) {
    const source = c.items.find((item) => item.diceId === opening.sourceDiceId)!;
    const warriors = c.items.filter((item) => item.tags.includes('warrior'));
    const strongest = warriors.reduce((best, item) => item.finalDamage > best.finalDamage ? item : best);
    const bonus = c.bonusDice.find((item) => item.id === id)!;
    const before = bonus.bonusDamage;
    bonus.bonusDamage = combatNumber(before + strongest.finalDamage);
    bonus.description = `取${strongest.diceName}的最終攻擊，追加攻擊 ${Math.ceil(bonus.bonusDamage)}`;
    const e = c.event(10, source, undefined, [strongest]);
    e.changes.push({ kind: 'bonus', targetId: id, before, after: bonus.bonusDamage });
  }
  for (const [id, factors] of c.repeatFactors) {
    const item = c.items.find((entry) => entry.diceId === id)!;
    if (item.finalDamage <= 0 || !factors.length) continue;
    const echoed = c.events.some((event) => event.sourceFaceId === item.faceId && event.skill === item.creature && event.echoed);
    const e = c.event(11, item);
    const copies = echoed ? 2 : c.echoMultiplier(e);
    for (let copy = 0; copy < copies; copy++) for (const factor of factors) {
      c.repeatAttacks.push({ diceId: id, sourceDiceId: id, damage: combatNumber(item.finalDamage * factor), label: e.ability });
      e.repeatDiceIds.push(id);
    }
  }
  for (const princess of c.items.filter((item) => item.creature === 'princess')) {
    const targets = c.items.filter((item) => item.diceId !== princess.diceId && item.tags.includes('noble') && item.finalDamage > 0);
    princess.skillInputs = { count: targets.length };
    if (!targets.length) continue;
    const e = c.event(11, princess, undefined, targets, 'attack');
    const copies = c.echoMultiplier(e);
    for (let copy = 0; copy < copies; copy++) for (const target of targets) {
      c.repeatAttacks.push({ diceId: target.diceId, damage: target.finalDamage, sourceDiceId: princess.diceId });
      e.repeatDiceIds.push(target.diceId);
      target.bonusTags.push('公主命令：再攻擊');
    }
  }
}
