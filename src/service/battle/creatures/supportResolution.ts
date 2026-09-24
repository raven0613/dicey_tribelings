import { storeRoundFood } from './foodResolution';
import { getFaceTags } from '../../dice/diceFaces';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';
import { resolveFoodBoost } from './identityResolution';

export function resolveSupport(c: ResolutionContext) {
  resolveFoodBoost(c);
  const slots = c.equipment.find((item) => item.ruleId === 'SLOTS');
  if (slots) {
    const counts = new Map<number, number>();
    c.items.forEach((item) => counts.set(item.baseValue, (counts.get(item.baseValue) ?? 0) + 1));
    const max = Math.max(...counts.values());
    const value = choose([...counts].filter(([, count]) => count === max).map(([value]) => value), c.state.seed, 'slots');
    const targets = c.items.filter((item) => item.baseValue === value);
    const e = c.equipmentEvent(4, slots, targets);
    for (const item of targets) if (item.creature !== 'princess') {
      c.attack(e, item, item.finalDamage + item.baseValue * (eq.matchedMultiplier - 1), `重擊 ×${eq.matchedMultiplier}`);
    }
  }
  for (const [index, item] of c.items.entries()) {
    const e = c.event(4, item);
    const add = (value: number) => c.attack(e, item, item.finalDamage + value);
    const participants = (ids: string[]) => { e.participantDiceIds = [...new Set([item.diceId, ...ids])]; };
    switch (item.creature) {
      case 'family':
        item.skillInputs = { count: c.faceCount(index, 'family') };
        add(item.baseValue * (b.family.multipliers[Math.min(item.skillInputs.count!, b.family.multipliers.length) - 1] - 1)); break;
      case 'sisters':
        item.skillInputs = { count: c.speciesCount('sisters'), minimum: b.sisters.minimum };
        if (item.skillInputs.count! >= b.sisters.minimum) {
          participants(c.countParticipants((entry) => entry.creature === 'sisters').map((entry) => entry.diceId));
          add(item.baseValue * ((item.skillInputs.count! >= b.sisters.middle ? b.sisters.highMultiplier : b.sisters.multiplier) - 1));
          if (item.skillInputs.count! >= b.sisters.repeatAt) c.repeatFactors.set(item.diceId, [1]);
        }
        break;
      case 'loner':
        item.skillInputs = { count: c.faceCount(index, 'loner'), secondaryCount: c.items.filter((other) => other.diceId !== item.diceId && other.tags.includes('warrior')).length };
        if (item.skillInputs.count === 1) add(item.baseValue * ((item.skillInputs.secondaryCount === 0 ? b.loner.soloMultiplier : b.loner.multiplier) - 1)); break;
      case 'follower': {
        const neighboringFaces = c.faces.flatMap((faces, other) => Math.abs(other - index) === b.follower.range ? faces : []);
        const values = neighboringFaces.filter((face) => face.creature === 'warrior').map((face) => face.baseValue);
        const highest = Math.max(0, ...values);
        const sides = c.faces.filter((faces, other) => Math.abs(other - index) === b.follower.range && faces.some((face) => face.creature === 'warrior')).length;
        item.skillInputs = { count: values.length, value: highest, secondaryCount: sides };
        if (sides === 2) c.repeatFactors.set(item.diceId, [b.follower.repeatMultiplier]);
        participants(c.items.filter((_, other) => Math.abs(other - index) === b.follower.range
          && c.faces[other].some((face) => face.creature === 'warrior' && face.baseValue === highest)).map((entry) => entry.diceId));
        add(highest); break;
      }
      case 'warrior': {
        const neighbors = c.items.filter((_, other) => Math.abs(other - index) === 1);
        participants(neighbors.filter((entry) => c.faceCount(c.items.indexOf(entry), 'follower') > 0).map((entry) => entry.diceId));
        const count = neighbors.reduce((sum, entry) => sum + c.faceCount(c.items.indexOf(entry), 'follower'), 0);
        item.skillInputs = { count };
        add(count * b.warrior.bonusPerFollower + item.baseValue * ((count >= b.warrior.high ? b.warrior.highMultiplier : count >= b.warrior.middle ? b.warrior.multiplier : 1) - 1)); break;
      }
      case 'elder':
        participants(c.items.filter((entry) => !CREATURE_CONFIG[entry.creature].tags.includes('food')).map((entry) => entry.diceId));
        item.skillInputs = { count: new Set(c.items.filter((entry) => !CREATURE_CONFIG[entry.creature].tags.includes('food')).map((entry) => entry.creature)).size };
        add(item.skillInputs.count! * (item.skillInputs.count! >= b.elder.high ? b.elder.highBonus : item.skillInputs.count! >= b.elder.middle ? b.elder.middleBonus : b.elder.bonusPerSpecies)); break;
      case 'royalGuard': {
        const nobles = c.faces[index].filter((face, faceIndex) => faceIndex !== item.faceIndex && getFaceTags(face).includes('noble'));
        item.skillInputs = { count: nobles.length };
        add(nobles.length * (nobles.length >= b.royalGuard.threshold ? b.royalGuard.highBonus : b.royalGuard.bonusPerNoble)); break;
      }
      case 'glutton': {
        const food = c.items.filter((entry) => entry.tags.includes('food'));
        const count = food.length + Number(c.virtualFood > 0);
        participants(food.map((entry) => entry.diceId));
        const multiplier = count ? 1 + count * b.glutton.perFood[Math.min(count, b.glutton.perFood.length) - 1] : b.glutton.hungryMultiplier;
        if (!count) e.ability = '我很餓！';
        item.skillInputs = { count, before: item.finalDamage };
        e.activated = true;
        add(combatNumber(item.baseValue * (multiplier - 1)) + (count >= b.glutton.sumAt ? food.reduce((sum, entry) => sum + c.foodValues[entry.diceId], c.virtualFood) : 0));
        item.skillInputs.after = item.finalDamage; break;
      }
      case 'guard': {
        participants(c.countParticipants((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).map((entry) => entry.diceId));
        const count = c.items.filter((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).length;
        item.skillInputs = { count };
        c.shield(e, item, count * (count >= b.guard.threshold ? b.guard.highShield : b.guard.shield)); break;
      }
      case 'artisan': {
        const count = c.adjacentFaces(index).filter((face) => getFaceTags(face).includes('craftsman')).length;
        item.skillInputs = { count };
        c.shield(e, item, count * (count >= b.artisan.threshold ? b.artisan.highShield : b.artisan.shield)); break;
      }
    }
    const cowardShield = c.state.cowardShields[item.diceId] ?? 0;
    if (cowardShield > 0) c.shield(c.event(4, item, CREATURE_CONFIG.coward.ability, [], 'support', 'coward'), item, cowardShield);
    const teacherBonus = c.state.teacherBonuses[item.diceId] ?? 0;
    if (teacherBonus > 0) c.attack(c.event(4, item, CREATURE_CONFIG.teacher.ability, [], 'support', 'teacher'), item, item.finalDamage + teacherBonus);
  }
  for (let start = 0; start < c.items.length; start++) {
    if (c.items[start].creature !== 'porter') continue;
    let end = start;
    while (c.items[end + 1]?.creature === 'porter') end++;
    let preceding = 0;
    const members = c.items.slice(start, end + 1);
    for (const member of members) {
      member.skillInputs = { count: members.length, value: preceding };
      const multiplier = members.length >= b.porter.doubleAt ? b.porter.multiplier : 1;
      if (preceding > 0 || multiplier > 1) c.attack(c.event(4, member, undefined, members, 'adjacent'), member,
        member.finalDamage + (member.baseValue + preceding) * multiplier - member.baseValue);
      if (member === members.at(-1) && members.length >= b.porter.tailAt) c.tailMultipliers.set(member.diceId, b.porter.multiplier);
      if (member === members.at(-1) && members.length >= b.porter.repeatAt) c.repeatFactors.set(member.diceId, [1]);
      preceding = combatNumber(preceding + member.baseValue);
    }
    start = end;
  }
  const barricade = c.equipment.find((item) => item.ruleId === 'BARRICADE');
  if (barricade) {
    const e = c.equipmentEvent(4, barricade, []);
    const gain = Math.ceil(combatNumber(eq.barricadeShield));
    e.changes.push({ kind: 'shield', targetId: 'player', before: c.teamShield.value, after: c.teamShield.value + gain });
    c.teamShield.value += gain;
  }
}

export function resolveFoodAndBonuses(c: ResolutionContext) {
  storeRoundFood(c);
  for (const [index, item] of c.items.entries()) {
    if (item.creature === 'chef') {
      const value = c.nextStoredFood[item.diceId] ?? 0;
      item.skillInputs = { value };
      if (value > 0) {
        const e = c.event(5, item);
        const high = value >= b.chef.burstAt;
        const remaining = combatNumber(value * (high ? b.chef.highRetention : value >= b.chef.retainAt ? b.chef.retention : 0));
        c.bonus(e, item, value * (high ? b.chef.multiplier : 1));
        e.changes.push({ kind: 'food', targetId: item.diceId, before: value, after: remaining });
        c.nextStoredFood[item.diceId] = remaining;
      }
    }
    if (item.creature === 'gang') {
      const count = c.adjacentFaces(index).filter((face) => face.creature === 'gang').length;
      const damage = count >= b.gang.middle ? b.gang.highDamage : b.gang.damagePerNeighbor;
      const copies = count * (count >= b.gang.doubleAt ? b.gang.copies : 1);
      item.skillInputs = { count, value: damage, secondaryCount: copies };
      if (copies) {
        const e = c.event(5, item);
        for (let attack = 0; attack < copies; attack++) c.bonus(e, item, damage);
      }
    }
    if (item.creature === 'cheerleader') {
      const warriors = c.countParticipants((entry) => entry.tags.includes('warrior'));
      item.skillInputs = { count: warriors.length };
      const e = c.event(5, item, undefined, warriors);
      for (const warrior of warriors) c.attack(e, warrior, warrior.finalDamage + b.cheerleader.bonusPerWarrior);
      if (warriors.length >= b.cheerleader.copyAt) {
        // Register quantity now. Damage is filled after every warrior's final modifier.
        const previousIds = new Set(c.bonusDice.map(bonus => bonus.id));
        c.bonus(e, item, b.cheerleader.bonusPerWarrior);
        for (const bonus of c.bonusDice.filter(bonus => !previousIds.has(bonus.id))) {
          const opening = c.events.find(event => event.bonusIds.includes(bonus.id))!;
          bonus.bonusDamage = 0;
          c.pendingCheers.set(bonus.id, opening);
          opening.changes = opening.changes.filter(change => change.targetId !== bonus.id);
        }
      }
    }
    if (item.creature === 'priest') {
      const count = c.nextAltars[item.diceId] ?? 0;
      const damage = count * (count >= b.priest.splitAt ? b.priest.highDamage : count >= b.priest.middle ? b.priest.middleDamage : b.priest.damagePerReroll);
      item.skillInputs = { count, value: damage };
      if (count) {
        const e = c.event(5, item);
        if (count >= b.priest.splitAt) {
          c.bonus(e, item, Math.floor(damage / 2));
          c.bonus(e, item, Math.ceil(damage / 2));
        } else c.bonus(e, item, damage);
        c.nextAltars[item.diceId] = 0;
      }
    }
  }
}

export function resolveSupportMultipliers(c: ResolutionContext) {
  for (const [id, multiplier] of c.tailMultipliers) {
    const item = c.items.find((entry) => entry.diceId === id)!;
    c.attack(c.event(5, item), item, item.finalDamage * multiplier);
  }
}
