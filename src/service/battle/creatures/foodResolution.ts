import { CREATURE_BALANCE } from '../../../configs/creatures/creatureBalanceConfig';
import { ceilDamage } from '../damageValue';
import { FOOD_CAPACITY } from '../../../configs/materials/materialConfig';
import { combatNumber } from './creatureState';
import { getEffectiveFace } from '../../dice/diceFaces';
import { splitInteger } from './splitInteger';
import type { Dice } from '../../../types/game';
import type { ResolutionContext } from './resolutionContext';

/** Initial stock is allocated once, after temporary faces have been applied. */
export function distributeInitialRations(dice: Dice[], amount: number, capacity: number = FOOD_CAPACITY.crocodile): Record<string, number> {
  const cooks = dice.filter(die => die.faces.some(face => getEffectiveFace(face).creature === 'chef'));
  if (!cooks.length || amount <= 0) return {};
  return Object.fromEntries(splitInteger(Math.min(amount, capacity), cooks.length)
    .map((share, index) => [cooks[index].id, share]));
}

/** Food deposits include the chef bonus before rounding and sharing the capacity. */
export function storeRoundFood(c: ResolutionContext) {
  const capacity = c.battle.foodCapacity ?? FOOD_CAPACITY.crocodile;
  const room = () => Math.max(0, combatNumber(capacity - Object.values(c.nextStoredFood).reduce((sum, value) => sum + value, 0)));
  const store = (item: typeof c.items[number], amount: number, event: ReturnType<typeof c.event>) => {
    const before = c.nextStoredFood[item.diceId] ?? 0;
    const after = combatNumber(before + amount);
    c.nextStoredFood[item.diceId] = after;
    c.log.change(event, { kind: 'food', targetId: item.diceId, before, after });
  };
  for (const [index, item] of c.items.entries()) {
    const chefs = c.faceCount(index, 'chef');
    if (!chefs || !item.tags.includes('food')) continue;
    const multiplier = item.creature === 'food' ? CREATURE_BALANCE.food.storageMultiplier : 1;
    const amount = Math.min(ceilDamage(item.finalDamage * multiplier + chefs * CREATURE_BALANCE.chef.storagePerFace), room());
    if (amount <= 0) continue;
    const event = c.event(5, item, '存糧', [], 'support', 'storage');
    store(item, amount, event);
    const replay = c.echoEvent(event);
    const extra = Math.min(amount, room());
    if (replay && extra > 0) store(item, extra, replay);
  }
}
