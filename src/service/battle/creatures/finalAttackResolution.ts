import type { ResolutionContext } from './resolutionContext';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { combatNumber } from './creatureState';

export function resolveFinalAttacks(c: ResolutionContext) {
  const highest = Math.max(0, ...c.items.map(item => item.finalDamage));
  for (const item of c.items) if (item.creature === 'loner' && item.externalGain && item.finalDamage === highest && highest > 0) c.repeatFactors.set(item.diceId, [1]);
  for (const [id, factors] of c.repeatFactors) {
    const item = c.items.find(entry => entry.diceId === id)!;
    if (item.attackTransferred || item.finalDamage <= 0 || !factors.length) continue;
    const e = c.event(11, item);
    const replay = c.echoEvent(e);
    for (const pass of replay ? [e, replay] : [e]) for (const factor of factors) {
      c.repeatAttacks.push({ diceId: id, sourceDiceId: id, damage: combatNumber(item.finalDamage * factor), label: pass.ability });
      c.log.repeat(pass, id);
    }
  }
  for (const princess of c.items.filter(item => item.creature === 'princess')) {
    const targets = c.items.filter(item => item !== princess && item.tags.includes('noble') && item.finalDamage > 0 && !item.attackTransferred);
    princess.skillInputs = { count: targets.length };
    if (!targets.length) continue;
    const e = c.event(11, princess, undefined, targets, 'attack');
    const replay = c.echoEvent(e);
    for (const pass of replay ? [e, replay] : [e]) for (const target of targets) {
      c.repeatAttacks.push({ diceId: target.diceId, sourceDiceId: princess.diceId, damage: target.finalDamage, label: pass.ability });
      c.log.repeat(pass, target.diceId);
    }
  }
  const frugal = c.equipment.find(item => item.ruleId === 'FRUGAL');
  if (frugal && c.state.controlSpent === 0 && !c.state.paidRerollUsed) {
    const e = c.equipmentEvent(11, frugal);
    for (const item of c.items) c.attack(e, item, item.finalDamage * eq.frugalMultiplier, undefined, false);
    for (const bonus of c.bonusDice) {
      const before = bonus.bonusDamage;
      bonus.bonusDamage = combatNumber(before * eq.frugalMultiplier);
      c.log.change(e, { kind: 'bonus', targetId: bonus.id, before, after: bonus.bonusDamage });
    }
    for (const repeat of c.repeatAttacks) repeat.damage = combatNumber(repeat.damage * eq.frugalMultiplier);
  }
}
