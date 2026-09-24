import { getFaceTags } from '../../dice/diceFaces';
import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

export function resolveIdentities(c: ResolutionContext) {
  const { items, state } = c;
  for (const item of items) if (item.rolledCreature === 'imposter' && item.creature !== 'imposter') {
    const e = c.event(2, item, `混入人群・${CREATURE_CONFIG[item.creature].name}`, [], 'support', 'imposter');
    c.identify(e, item);
  }
  const foodExists = items.some((item) => item.tags.includes('food')) || state.virtualFood > 0;
  if (!foodExists) for (const farmer of items.filter((item) => item.creature === 'farmer')) {
    const e = c.event(2, farmer);
    farmer.skillInputs = { count: 0, value: farmer.baseValue };
    farmer.creature = 'food'; farmer.tags = getFaceTags(farmer);
    c.identify(e, farmer);
    const replay = c.echoEvent(e);
    if (replay) {
      c.foodValues[farmer.diceId] = combatNumber(c.foodValues[farmer.diceId] + farmer.baseValue);
      c.attack(replay, farmer, farmer.finalDamage + farmer.baseValue);
    }
  }
  const originalNobles = items.filter((item) => item.tags.includes('noble')).length;
  for (const [index, authority] of items.entries()) {
    if (authority.creature !== 'authority') continue;
    const candidates = c.neighbors(index).filter((item) => item.tags.includes('common'));
    const saved = state.authorityTargets[authority.diceId];
    const target = candidates.find((item) => item.diceId === saved?.diceId
      && (state.faceVersions[item.diceId] ?? 0) === saved.version)
      ?? choose(candidates, state.seed, authority.diceId);
    authority.skillInputs = { count: originalNobles, secondaryCount: candidates.length };
    if (!target) continue;
    const e = c.event(2, authority, undefined, [target], 'adjacent');
    const replay = c.echoEvent(e);
    const extra = candidates.find(item => item.diceId !== target.diceId);
    const crownTarget = (subject: typeof target, event: typeof e) => {
      subject.tags = subject.material === 'iridescent' ? getFaceTags(subject)
        : [...new Set(subject.tags.map(tag => tag === 'common' ? 'noble' : tag))];
      c.identify(event, subject);
      if (originalNobles >= b.authority.threshold) {
        // Each coronation strengthens its own target once.
        const before = subject.finalDamage;
        subject.finalDamage = combatNumber(before + subject.baseValue * b.authority.bonus);
        event.changes.push({ kind: 'attack', targetId: subject.diceId, before, after: subject.finalDamage });
      }
    };
    crownTarget(target, e);
    if (replay && extra) { replay.participantDiceIds = [authority.diceId, extra.diceId]; crownTarget(extra, replay); }
  }

  const crown = c.equipment.find((item) => item.ruleId === 'CROWN');
  if (crown) {
    const target = items.filter((item) => item.tags.includes('common')).sort((a, z) => z.baseValue - a.baseValue)[0];
    if (target) {
      const e = c.equipmentEvent(2, crown, [target]);
      target.tags = target.material === 'iridescent' ? getFaceTags(target) : [...new Set(target.tags.map((tag) => tag === 'common' ? 'noble' : tag))];
      c.identify(e, target);
    }
  }
  for (const knight of items.filter((item) => item.creature === 'knight')) {
    const targets = items.filter((item) => item.diceId !== knight.diceId && item.tags.includes('common'));
    const count = targets.length;
    knight.skillInputs = { count };
    const e = c.event(3, knight, undefined, targets);
    const amount = count * (count >= b.knight.nobleAt ? b.knight.highBonus : b.knight.bonus);
    c.attack(e, knight, knight.finalDamage + amount);
    if (count >= b.knight.burstAt) c.tailMultipliers.set(knight.diceId, b.knight.multiplier);
    if (count >= b.knight.nobleAt && !knight.tags.includes('noble')) {
      knight.tags.push('noble'); c.identify(e, knight);
    }
  }
  for (const [index, item] of items.entries()) {
    if (item.creature === 'twins') {
      const value = Math.max(...c.faces[index].filter((face) => face.creature === 'twins').map((face) => face.baseValue));
      const e = c.event(3, item);
      item.skillInputs = { count: c.faceCount(index, 'twins'), before: item.baseValue, after: value };
      const count = item.skillInputs.count!;
      c.repeatFactors.set(item.diceId, count >= b.twins.doubleAt ? [1, 1] : count >= b.twins.fullAt ? [1] : count >= b.twins.halfAt ? [b.twins.half] : []);
      const before = item.baseValue;
      c.attack(e, item, item.finalDamage + value - before);
    }
    if (item.creature === 'princess') c.attack(c.event(3, item, '公主就位', [], 'support', 'princessReady'), item, 0);
    if (state.lockedDice.includes(item.diceId)) {
      const whistle = c.equipment.find((entry) => entry.ruleId === 'WHISTLE');
      if (whistle) {
        const e = c.equipmentEvent(3, whistle, [item]);
        if (item.creature !== 'princess') c.attack(e, item, item.finalDamage + eq.whistleBonus);
      }
    }
  }
}

export function resolveFoodBoost(c: ResolutionContext) {
  for (const [index, fruit] of c.items.entries()) if (fruit.creature === 'fruit') {
    const otherFood = c.items.filter((item) => item.diceId !== fruit.diceId && item.tags.includes('food')).length + Number(c.virtualFood > 0);
    fruit.skillInputs = { count: otherFood };
    const targets = c.neighbors(index);
    const e = c.event(4, fruit, undefined, targets, 'adjacent');
    const amount = otherFood > 0 ? b.fruit.highBonus : b.fruit.bonus;
    for (const target of targets) {
      c.attack(e, target, target.finalDamage + amount);
      if (target.tags.includes('food')) c.foodValues[target.diceId] = combatNumber(c.foodValues[target.diceId] + amount * c.echoMultiplier(e));
    }
  }
  const farmers = c.items.filter((item) => item.creature === 'farmer');
  const foods = c.items.filter((item) => item.tags.includes('food'));
  const count = foods.length + Number(c.virtualFood > 0);
  const amount = b.farmer.foodBonus * (count >= b.farmer.threshold ? count : 1);
  for (const farmer of farmers) {
    farmer.skillInputs = { count: foods.length + Number(c.virtualFood > 0), virtualFood: !foods.length };
    if (!foods.length) {
      if (c.virtualFood > 0) {
        const e = c.event(4, farmer);
        const replay = c.echoEvent(e);
        for (const event of replay ? [e, replay] : [e]) {
          const before = c.virtualFood;
          c.virtualFood = combatNumber(before + amount);
          event.changes.push({ kind: 'food', targetId: 'virtual-food', before, after: c.virtualFood });
        }
      }
      continue;
    }
    const index = c.items.indexOf(farmer);
    const distance = (food: typeof farmer) => Math.abs(c.items.indexOf(food) - index);
    const food = foods.reduce((nearest, candidate) => distance(candidate) < distance(nearest) ? candidate : nearest);
    const e = c.event(4, farmer, undefined, [food]);
    c.foodValues[food.diceId] = combatNumber(c.foodValues[food.diceId] + amount * c.echoMultiplier(e));
    c.attack(e, food, food.finalDamage + amount);
  }
}
