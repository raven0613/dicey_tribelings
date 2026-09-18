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
  }
  for (const [index, authority] of items.entries()) {
    if (authority.creature !== 'authority') continue;
    const candidates = c.neighbors(index).filter((item) => item.tags.includes('common'));
    const saved = state.authorityTargets[authority.diceId];
    const target = candidates.find((item) => item.diceId === saved?.diceId
      && (state.faceVersions[item.diceId] ?? 0) === saved.version)
      ?? choose(candidates, state.seed, authority.diceId);
    authority.skillInputs = { count: candidates.length };
    if (!target) continue;
    const e = c.event(2, authority, undefined, [target], 'adjacent');
    target.tags = target.material === 'iridescent' ? getFaceTags(target) : [...new Set(target.tags.map((tag) => tag === 'common' ? 'noble' : tag))];
    c.identify(e, target);
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
  for (const [index, item] of items.entries()) {
    if (item.creature === 'twins') {
      const value = Math.max(...c.faces[index].filter((face) => face.creature === 'twins').map((face) => face.baseValue));
      const e = c.event(3, item);
      item.skillInputs = { count: c.faceCount(index, 'twins'), before: item.baseValue, after: value };
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
  const farmers = c.items.filter((item) => item.creature === 'farmer');
  const foods = c.items.filter((item) => item.tags.includes('food'));
  for (const farmer of farmers) {
    farmer.skillInputs = { count: foods.length + Number(c.virtualFood > 0), virtualFood: !foods.length };
    if (!foods.length) {
      if (c.virtualFood > 0) {
        const before = c.virtualFood;
        const e = c.event(4, farmer);
        c.virtualFood = combatNumber(before + b.farmer.foodBonus * c.echoMultiplier(e));
        e.changes.push({ kind: 'food', targetId: 'virtual-food', before, after: c.virtualFood });
      }
      continue;
    }
    const index = c.items.indexOf(farmer);
    const distance = (food: typeof farmer) => Math.abs(c.items.indexOf(food) - index);
    const food = foods.reduce((nearest, candidate) => distance(candidate) < distance(nearest) ? candidate : nearest);
    const e = c.event(4, farmer, undefined, [food]);
    c.foodValues[food.diceId] = combatNumber(c.foodValues[food.diceId] + b.farmer.foodBonus * c.echoMultiplier(e));
    c.attack(e, food, food.finalDamage + b.farmer.foodBonus);
  }
}
