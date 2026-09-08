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
        item.skillInputs = { count: c.faceCount(index, 'family') - 1 };
        add(item.skillInputs.count! * b.family.bonus); break;
      case 'sisters':
        item.skillInputs = { count: c.speciesCount('sisters'), minimum: b.sisters.minimum };
        if (item.skillInputs.count! >= b.sisters.minimum) {
          participants(c.countParticipants((entry) => entry.creature === 'sisters').map((entry) => entry.diceId));
          add(b.sisters.bonus);
        }
        break;
      case 'loner':
        item.skillInputs = { count: c.faceCount(index, 'loner') };
        if (item.skillInputs.count === 1) add(item.baseValue * (b.loner.multiplier - 1)); break;
      case 'follower': {
        const neighboringFaces = c.faces.flatMap((faces, other) => Math.abs(other - index) === b.follower.range ? faces : []);
        const values = neighboringFaces.filter((face) => face.creature === 'warrior').map((face) => face.baseValue);
        const highest = Math.max(0, ...values);
        item.skillInputs = { count: values.length, value: highest };
        participants(c.items.filter((_, other) => Math.abs(other - index) === b.follower.range
          && c.faces[other].some((face) => face.creature === 'warrior' && face.baseValue === highest)).map((entry) => entry.diceId));
        add(highest); break;
      }
      case 'warrior': {
        const neighbors = c.items.filter((_, other) => Math.abs(other - index) === 1);
        participants(neighbors.filter((entry) => c.faceCount(c.items.indexOf(entry), 'follower') > 0).map((entry) => entry.diceId));
        const count = neighbors.reduce((sum, entry) => sum + c.faceCount(c.items.indexOf(entry), 'follower'), 0);
        item.skillInputs = { count };
        add(count * b.warrior.bonusPerFollower); break;
      }
      case 'elder':
        participants(c.items.filter((entry) => entry.creature !== 'food').map((entry) => entry.diceId));
        item.skillInputs = { count: new Set(c.items.filter((entry) => entry.creature !== 'food').map((entry) => entry.creature)).size };
        add(item.skillInputs.count! * b.elder.bonusPerSpecies); break;
      case 'knight': {
        const commons = c.countParticipants((entry) => entry.tags.includes('common')).filter((entry) => entry.diceId !== item.diceId);
        const count = c.items.filter((entry) => entry.diceId !== item.diceId && entry.tags.includes('common')).length
          + c.virtualFaces.filter((face) => face.sourceDiceId !== item.diceId && face.tags.includes('common')).length;
        item.skillInputs = { count };
        if (count > 0) { participants(commons.map((entry) => entry.diceId)); add(b.knight.bonus); }
        break;
      }
      case 'royalGuard': {
        const nobles = c.faces[index].filter((face, faceIndex) => faceIndex !== item.faceIndex && CREATURE_CONFIG[face.creature].tags.includes('noble'));
        item.skillInputs = { count: nobles.length };
        add(nobles.length * b.royalGuard.bonusPerNoble); break;
      }
      case 'glutton': {
        const food = c.items.filter((entry) => entry.creature === 'food');
        const count = food.length + Number(c.virtualFood > 0);
        participants(food.map((entry) => entry.diceId));
        const multiplier = count ? 1 + count * b.glutton.foodMultiplier : b.glutton.hungryMultiplier;
        if (!count) e.ability = '我很餓！';
        item.skillInputs = { count, before: item.finalDamage };
        e.activated = true;
        add(combatNumber(item.baseValue * (multiplier - 1)));
        item.skillInputs.after = item.finalDamage; break;
      }
      case 'guard': {
        participants(c.countParticipants((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).map((entry) => entry.diceId));
        const count = c.items.filter((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).length
          + c.virtualFaces.filter((face) => face.tags.includes('common') || face.tags.includes('noble')).length;
        item.skillInputs = { count };
        c.shield(e, item, count * b.guard.shield); break;
      }
      case 'artisan': {
        const count = c.adjacentFaces(index).filter((face) => CREATURE_CONFIG[face.creature].tags.includes('craftsman')).length;
        item.skillInputs = { count };
        c.shield(e, item, count * b.artisan.shield); break;
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
    for (const member of c.items.slice(start, end + 1)) member.skillInputs = { count: end - start + 1 };
    if (end > start) {
      const tail = c.items[end];
      c.attack(c.event(4, tail, '接力', c.items.slice(start, end + 1), 'adjacent'), tail,
        tail.finalDamage + tail.baseValue * (end - start), `基礎 ×${end - start + 1}`);
    }
    start = end;
  }
  const barricade = c.equipment.find((item) => item.ruleId === 'BARRICADE');
  if (barricade && c.items[0]) c.shield(c.equipmentEvent(4, barricade), c.items[0], eq.barricadeShield);
}

export function resolveFoodAndBonuses(c: ResolutionContext) {
  for (const [index, item] of c.items.entries()) {
    if (c.faceCount(index, 'chef') > 0) {
      const foodValue = (item.creature === 'food' ? item.baseValue : 0) + c.virtualFood;
      if (foodValue > 0) {
        const before = c.nextStoredFood[item.diceId] ?? 0;
        const after = combatNumber(before + foodValue);
        c.nextStoredFood[item.diceId] = after;
        c.event(5, item, '儲糧', [], 'support', 'storage').changes.push({ kind: 'food', targetId: item.diceId, before, after });
        item.bonusTags.push(`儲糧 ${before}→${after}`);
      }
    }
    if (item.creature === 'chef') item.skillInputs = { value: c.nextStoredFood[item.diceId] ?? 0 };
    if (item.creature === 'chef' && item.skillInputs.value! > 0) {
      const value = c.nextStoredFood[item.diceId];
      const e = c.event(5, item);
      c.bonus(e, item, value);
      e.changes.push({ kind: 'food', targetId: item.diceId, before: value, after: 0 });
      c.nextStoredFood[item.diceId] = 0;
    }
    if (item.creature === 'gang') {
      const count = c.adjacentFaces(index).filter((face) => face.creature === 'gang').length;
      item.skillInputs = { count, value: b.gang.damagePerNeighbor };
      if (count > 0) {
        const e = c.event(5, item);
        for (let attack = 0; attack < count; attack++) c.bonus(e, item, b.gang.damagePerNeighbor);
      }
    }
    if (item.creature === 'cheerleader') {
      const warriors = c.countParticipants((entry) => entry.tags.includes('warrior'));
      item.skillInputs = { count: c.tagCount('warrior') };
      c.bonus(c.event(5, item, undefined, warriors), item, item.skillInputs.count! * b.cheerleader.damagePerWarrior);
    }
    const priest = c.state.priestAttacks[item.diceId] ?? 0;
    if (item.creature === 'priest') item.skillInputs = { count: priest / b.priest.damagePerReroll, value: priest };
    if (priest > 0) c.bonus(c.event(5, item, CREATURE_CONFIG.priest.ability, [], 'support', 'priest'), item, priest, 'priest');
  }
}
