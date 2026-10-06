import { getFaceTags } from '../../dice/diceFaces';
import { CREATURE_BALANCE as b } from '../../../configs/creatures/creatureBalanceConfig';
import type { ResolutionContext } from './resolutionContext';

export function resolveRoleBases(c: ResolutionContext) {
  for (const [index, item] of c.items.entries()) {
    const row = c.faces[index];
    const pip = (i: number) => c.dice[index].faces[i].baseValue;
    const count = row.filter(face => face.creature === item.creature).length;
    item.skillInputs = { count };
    let gain = 0;
    if (item.creature === 'princess') gain = -item.finalDamage;
    if (item.creature === 'family') gain = count * b.family.bonusPerFace;
    if (item.creature === 'twins') {
      gain = Math.max(...row.flatMap((face, i) => face.creature === 'twins' ? [pip(i)] : [])) - item.pipValue;
      c.repeatFactors.set(item.diceId, Array(Math.floor(count / b.twins.facesPerPair)).fill(1));
    }
    if (item.creature === 'loner' && count === 1) gain = item.pipValue * (b.loner.multiplier - 1);
    if (gain) c.attack(c.event(1, item, undefined, [], 'support', item.creature === 'princess' ? 'princessReady' : item.creature), item, item.finalDamage + gain, undefined, false);
  }
}

export function resolveIdentities(c: ResolutionContext) {
  const { items, state } = c;
  for (const item of items) if (item.rolledCreature === 'imposter' && item.creature !== 'imposter') c.identify(c.event(2, item, '混入人群', [], 'support', 'imposter'), item);
  const foodExists = items.some(item => item.tags.includes('food'));
  if (!foodExists) for (const farmer of items.filter(item => item.creature === 'farmer')) {
    const e = c.event(2, farmer);
    farmer.creature = 'food'; farmer.tags = getFaceTags(farmer);
    c.faces[items.indexOf(farmer)][farmer.faceIndex] = { ...c.faces[items.indexOf(farmer)][farmer.faceIndex], creature: 'food' };
    c.identify(e, farmer);
    if (c.echoEvent(e)) c.attack(c.echoEvent(e)!, farmer, farmer.finalDamage + farmer.baseValue, undefined, false);
  }
  const originalNobles = items.filter(item => item.tags.includes('noble')).length;
  for (const [index, authority] of items.entries()) if (authority.creature === 'authority') {
    const targets = c.neighbors(index).filter(item => item.tags.includes('common'));
    const amount = Math.max(0, originalNobles - 1) * b.authority.bonusPerNoble;
    authority.skillInputs = { count: Math.max(0, originalNobles - 1), secondaryCount: targets.length };
    if (!targets.length) continue;
    const e = c.event(2, authority, undefined, targets, 'adjacent');
    c.echoEvent(e);
    for (const target of targets) {
      target.tags = [...new Set([...target.tags, 'noble' as const])];
      c.identify(e, target);
      c.attack(e, target, target.finalDamage + amount);
    }
  }
  const crown = c.equipment.find(item => item.ruleId === 'CROWN');
  if (crown) {
    const target = items.filter(item => item.tags.includes('common')).sort((a, z) => z.baseValue - a.baseValue)[0];
    if (target) {
      const e = c.equipmentEvent(2, crown, [target]);
      target.tags = target.material === 'iridescent' ? getFaceTags(target) : [...new Set(target.tags.map(tag => tag === 'common' ? 'noble' as const : tag))];
      c.identify(e, target);
    }
  }
  for (const [index, knight] of items.entries()) if (knight.creature === 'knight') {
    const common = items.filter(item => item !== knight && item.tags.includes('common'));
    const e = c.event(3, knight, undefined, common);
    knight.skillInputs = { count: common.length };
    c.attack(e, knight, knight.finalDamage + common.length * b.knight.bonus, undefined, false);
    const neighbors = c.neighbors(index);
    if (neighbors.length === 2 && neighbors.every(item => item.tags.includes('common'))) {
      knight.tags = [...new Set([...knight.tags, 'noble' as const])]; c.identify(e, knight);
    }
  }
  for (const item of items) if (state.lockedDice.includes(item.diceId)) {
    const whistle = c.equipment.find(entry => entry.ruleId === 'WHISTLE');
    if (whistle) c.attack(c.equipmentEvent(3, whistle, [item]), item, item.finalDamage + EQUIPMENT_BALANCE.whistleBonus);
  }
}
import { EQUIPMENT_BALANCE } from '../../../configs/equipment/equipmentConfig';

export function resolveFoodBoost(c: ResolutionContext) {
  for (const [index, fruit] of c.items.entries()) if (fruit.creature === 'fruit') {
    const count = c.items.filter(item => item !== fruit && item.tags.includes('food')).length;
    fruit.skillInputs = { count };
    const targets = c.neighbors(index);
    const e = c.event(4, fruit, undefined, targets, 'adjacent');
    for (const target of targets) c.attack(e, target, target.finalDamage + (count ? b.fruit.highBonus : b.fruit.bonus));
  }
  const foods = c.items.filter(item => item.tags.includes('food'));
  for (const [index, farmer] of c.items.entries()) if (farmer.creature === 'farmer') {
    const amount = c.faces[index].filter(face => face.creature === 'farmer' || getFaceTags(face).includes('food')).length;
    farmer.skillInputs = { count: amount };
    const nearest = foods.reduce<typeof foods[number] | undefined>((best, food) => !best || Math.abs(c.items.indexOf(food) - index) < Math.abs(c.items.indexOf(best) - index) ? food : best, undefined);
    const e = c.event(4, farmer, undefined, nearest ? [nearest] : []);
    if (nearest) c.attack(e, nearest, nearest.finalDamage + amount);
  }
}
