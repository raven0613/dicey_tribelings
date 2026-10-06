import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

function chooseRobberyTarget(c: ResolutionContext, sourceId: string, candidates: ResolutionContext['items']) {
  const remaining = c.items.map((item) => item.diceId).filter((id) => id !== sourceId).sort();
  const key = `steal:${sourceId}:${c.state.faceVersions[sourceId] ?? 0}`;
  // Draw from the complete roster in a stable order; eligibility only controls acceptance.
  for (let priority = 0; remaining.length; priority++) {
    const id = choose(remaining, c.state.roundSeed, `${key}:${priority}`)!;
    const target = candidates.find((item) => item.diceId === id);
    if (target) return target;
    remaining.splice(remaining.indexOf(id), 1);
  }
}

export function resolveRobbery(c: ResolutionContext) {
  const stolen = new Set<string>();
  const culprits = new Set<string>();
  let captures = 0;
  for (const [index, source] of c.items.entries()) {
    if (source.creature !== 'boss' && source.creature !== 'bully') continue;
    const candidates = source.creature === 'boss'
      ? c.items.filter((item) => item.diceId !== source.diceId && item.tags.includes('common') && item.finalDamage > 0 && !stolen.has(item.diceId))
      : c.neighbors(index).filter((item) => !CREATURE_CONFIG[item.creature].tags.includes('food') && item.finalDamage > 0);
    const target = source.creature === 'boss' ? chooseRobberyTarget(c, source.diceId, candidates) : undefined;
    const targets = source.creature === 'boss' ? target ? [target] : [] : candidates;
    source.skillInputs = { count: captures, secondaryCount: targets.length };
    for (const victim of targets) {
      const craftsman = victim.tags.includes('craftsman');
      const e = c.event(6, source, source.creature === 'bully' && craftsman ? '保護費MAX' : undefined, [victim], 'robbery');
      const removed = combatNumber(victim.finalDamage * (source.creature === 'boss' ? 1 : b.bully.stolenFraction));
      if (removed <= 0) continue;
      captures += source.creature === 'bully' && craftsman ? 2 : 1;
      const multiplier = source.creature === 'boss' ? 1 + captures * b.boss.perRobbery
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
      const damage = c.faces[c.items.indexOf(thief)].filter(face => face.creature === 'thief').reduce((sum, face) => sum + face.baseValue, 0);
      for (let n = 0; n < captures; n++) c.bonus(e, thief, damage);
    }
  }
  const detectives = c.items.filter((item) => item.creature === 'detective');
  const offenders = c.items.filter((item) => culprits.has(item.diceId));
  if (detectives.length && offenders.length) {
    const total = combatNumber(offenders.reduce((sum, item) => sum + item.finalDamage, 0) * b.detective.multiplier);
    const confiscation = c.event(7, detectives[0], undefined, offenders);
    for (const offender of offenders) c.attack(confiscation, offender, 0);
    for (const detective of detectives) {
      detective.skillInputs = { count: offenders.length, value: total };
      const e = c.event(7, detective, undefined, offenders);
      c.attack(e, detective, detective.finalDamage + total);
    }
  }
  return captures;
}
