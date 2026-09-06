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
      case 'family': add((c.faceCount(index, 'family') - 1) * b.family.bonus); break;
      case 'sisters':
        if (c.speciesCount('sisters') >= b.sisters.minimum) {
          participants(c.countParticipants((entry) => entry.creature === 'sisters').map((entry) => entry.diceId));
          add(b.sisters.bonus);
        }
        break;
      case 'loner': if (c.faceCount(index, 'loner') === 1) add(item.baseValue * (b.loner.multiplier - 1)); break;
      case 'follower': {
        const neighboringFaces = c.faces.flatMap((faces, other) => Math.abs(other - index) === b.follower.range ? faces : []);
        const values = neighboringFaces.filter((face) => face.creature === 'warrior').map((face) => face.baseValue);
        participants(c.neighbors(index).filter((entry) => entry.creature === 'warrior').map((entry) => entry.diceId));
        add(Math.max(0, ...values)); break;
      }
      case 'warrior':
        participants(c.countParticipants((entry) => entry.creature === 'follower').map((entry) => entry.diceId));
        add((c.speciesCount('follower') + c.faceCount(index, 'follower')) * b.warrior.bonusPerFollower); break;
      case 'elder':
        participants(c.items.filter((entry) => entry.creature !== 'food').map((entry) => entry.diceId));
        add(new Set(c.items.filter((entry) => entry.creature !== 'food').map((entry) => entry.creature)).size * b.elder.bonusPerSpecies); break;
      case 'knight': {
        const commons = c.countParticipants((entry) => entry.tags.includes('common')).filter((entry) => entry.diceId !== item.diceId);
        if (c.tagCount('common') > 0) { participants(commons.map((entry) => entry.diceId)); add(b.knight.bonus); }
        break;
      }
      case 'royalGuard': {
        const nobles = c.faces[index].filter((face, faceIndex) => faceIndex !== item.faceIndex && CREATURE_CONFIG[face.creature].tags.includes('noble'));
        add(nobles.length * b.royalGuard.bonusPerNoble); break;
      }
      case 'glutton': {
        const food = c.items.filter((entry) => entry.creature === 'food');
        const count = food.length + (c.state.virtualFood > 0 ? 1 : 0);
        participants(food.map((entry) => entry.diceId));
        const multiplier = count ? 1 + count * b.glutton.foodMultiplier : b.glutton.hungryMultiplier;
        if (!count) e.ability = '我很餓！';
        add(combatNumber(item.baseValue * (multiplier - 1))); break;
      }
      case 'guard': {
        participants(c.countParticipants((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).map((entry) => entry.diceId));
        const count = c.items.filter((entry) => entry.tags.includes('common') || entry.tags.includes('noble')).length
          + c.virtualFaces.filter((face) => face.tags.includes('common') || face.tags.includes('noble')).length;
        c.shield(e, item, count * b.guard.shield); break;
      }
    }
    if (c.faceCount(index, 'artisan') > 0) {
      const neighbors = c.neighbors(index).filter((entry) => entry.creature !== 'food');
      c.shield(c.event(4, item, '鍛造', neighbors), item, neighbors.length * b.artisan.shield);
    }
    const cowardShield = c.state.cowardShields[item.diceId] ?? 0;
    if (cowardShield > 0) c.shield(c.event(4, item, '你不要過來啊'), item, cowardShield);
    const teacherBonus = c.state.teacherBonuses[item.diceId] ?? 0;
    if (teacherBonus > 0) c.attack(c.event(4, item, '那我考考你'), item, item.finalDamage + teacherBonus);
  }
  for (let start = 0; start < c.items.length; start++) {
    if (c.items[start].creature !== 'porter') continue;
    let end = start;
    while (c.items[end + 1]?.creature === 'porter') end++;
    if (end > start) {
      const tail = c.items[end];
      c.attack(c.event(4, tail, '接力', c.items.slice(start, end + 1)), tail,
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
      const foodValue = (item.creature === 'food' ? item.baseValue : 0) + c.state.virtualFood;
      if (foodValue > 0) {
        const before = c.nextStoredFood[item.diceId] ?? 0;
        const after = combatNumber(before + foodValue);
        c.nextStoredFood[item.diceId] = after;
        c.event(5, item, '儲糧').changes.push({ kind: 'food', targetId: item.diceId, before, after });
        item.bonusTags.push(`儲糧 ${before}→${after}`);
      }
    }
    if (item.creature === 'chef' && (c.nextStoredFood[item.diceId] ?? 0) > 0) {
      const value = c.nextStoredFood[item.diceId];
      const e = c.event(5, item);
      c.bonus(e, item, value);
      e.changes.push({ kind: 'food', targetId: item.diceId, before: value, after: 0 });
      c.nextStoredFood[item.diceId] = 0;
    }
    if (item.creature === 'gang' && c.faceCount(index, 'gang') >= b.gang.minimum) c.bonus(c.event(5, item), item, item.baseValue);
    if (item.creature === 'cheerleader') {
      const warriors = c.countParticipants((entry) => entry.tags.includes('warrior'));
      c.bonus(c.event(5, item, undefined, warriors), item, c.tagCount('warrior') * b.cheerleader.damagePerWarrior);
    }
    const priest = c.state.priestAttacks[item.diceId] ?? 0;
    if (priest > 0) c.bonus(c.event(5, item, '犧牲召喚'), item, priest, 'priest');
  }
}
