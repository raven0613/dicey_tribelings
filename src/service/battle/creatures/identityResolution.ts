import { CREATURE_CONFIG } from '../../../configs/creatures/creatureConfig';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import { EQUIPMENT_BALANCE as eq } from '../../../configs/equipment/equipmentConfig';
import type { CreatureId } from '../../../types/creatures';
import { choose, combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

export function resolveIdentities(c: ResolutionContext) {
  const { items, state } = c;
  const foodExists = items.some((item) => item.creature === 'food') || state.virtualFood > 0;
  if (!foodExists) for (const farmer of items.filter((item) => item.creature === 'farmer')) {
    const e = c.event(2, farmer);
    farmer.creature = 'food'; farmer.tags = ['food'];
    c.identify(e, farmer);
  }
  for (const [index, authority] of items.entries()) {
    if (authority.creature !== 'authority') continue;
    const candidates = c.neighbors(index).filter((item) => item.tags.includes('common'));
    const saved = state.authorityTargets[authority.diceId];
    const target = candidates.find((item) => item.diceId === saved?.diceId
      && (state.faceVersions[item.diceId] ?? 0) === saved.version)
      ?? choose(candidates, state.seed, authority.diceId);
    if (!target) continue;
    const e = c.event(2, authority, undefined, [target]);
    target.tags = target.tags.map((tag) => tag === 'common' ? 'noble' : tag);
    c.identify(e, target);
  }
  const crown = c.equipment.find((item) => item.ruleId === 'CROWN');
  if (crown) {
    const target = items.filter((item) => item.tags.includes('common')).sort((a, z) => z.baseValue - a.baseValue)[0];
    if (target) {
      const e = c.equipmentEvent(2, crown, [target]);
      target.tags = target.tags.map((tag) => tag === 'common' ? 'noble' : tag);
      c.identify(e, target);
    }
  }
  const counts = new Map<CreatureId, number>();
  for (const item of items) if (item.creature !== 'food') counts.set(item.creature, (counts.get(item.creature) ?? 0) + 1);
  const maximum = Math.max(0, ...counts.values());
  const candidates = [...counts].filter(([, count]) => count === maximum).map(([id]) => id);
  for (const imposter of items.filter((item) => item.creature === 'imposter')) {
    const copied = choose(candidates, state.seed, `imposter:${imposter.diceId}`);
    if (!copied) continue;
    const exemplars = items.filter((item) => item.creature === copied);
    c.virtualFaces.push({ sourceDiceId: imposter.diceId, creature: copied, tags: [...exemplars[0].tags] });
    c.event(3, imposter, `混入人群・${CREATURE_CONFIG[copied].name}`, exemplars);
    imposter.bonusTags.push(`${CREATURE_CONFIG[copied].name} 計數 +1`);
  }
  for (const [index, item] of items.entries()) {
    if (item.creature === 'twins') {
      const value = Math.max(...c.faces[index].filter((face) => face.creature === 'twins').map((face) => face.baseValue));
      const e = c.event(3, item);
      item.baseValue = value; c.attack(e, item, value);
    }
    if (item.creature === 'princess') c.attack(c.event(3, item, '公主就位'), item, 0);
    if (state.lockedDice.includes(item.diceId)) {
      const whistle = c.equipment.find((entry) => entry.ruleId === 'WHISTLE');
      if (whistle) {
        const e = c.equipmentEvent(3, whistle, [item]);
        item.baseValue += eq.whistleBonus;
        if (item.creature !== 'princess') c.attack(e, item, item.finalDamage + eq.whistleBonus);
      }
    }
  }
}

export function resolveFoodBoost(c: ResolutionContext) {
  const farmers = c.items.filter((item) => item.creature === 'farmer');
  const foods = c.items.filter((item) => item.creature === 'food');
  if (!farmers.length || !foods.length) return;
  for (const farmer of farmers) {
    const e = c.event(4, farmer, undefined, foods);
    const cents = Math.round(b.farmer.foodBonus * 100);
    foods.forEach((food, index) => {
      const amount = (Math.floor(cents / foods.length) + (index < cents % foods.length ? 1 : 0)) / 100;
      food.baseValue = combatNumber(food.baseValue + amount);
      c.attack(e, food, food.finalDamage + amount);
    });
  }
}
