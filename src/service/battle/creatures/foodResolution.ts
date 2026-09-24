import { FOOD_CAPACITY } from '../../../configs/materials/materialConfig';
import { combatNumber } from './creatureState';
import type { ResolutionContext } from './resolutionContext';

/** 先存實體食物，再將一份乾糧的可入庫量平均分配；預覽只修改本次結算副本。 */
export function storeRoundFood(c: ResolutionContext) {
  const cooks = c.items.filter((_, index) => c.faceCount(index, 'chef') > 0);
  const capacity = c.battle.foodCapacity ?? FOOD_CAPACITY.crocodile;
  const room = () => Math.max(0, combatNumber(capacity - Object.values(c.nextStoredFood).reduce((sum, value) => sum + value, 0)));
  const store = (item: typeof c.items[number], amount: number, event: ReturnType<typeof c.event>) => {
    const before = c.nextStoredFood[item.diceId] ?? 0;
    const after = combatNumber(before + amount);
    c.nextStoredFood[item.diceId] = after;
    event.changes.push({ kind: 'food', targetId: item.diceId, before, after });
  };
  for (const item of cooks) {
    const amount = Math.min(item.tags.includes('food') ? c.foodValues[item.diceId] : 0, room());
    if (amount <= 0) continue;
    const event = c.event(5, item, '存糧', [], 'support', 'storage');
    store(item, amount, event);
    const replay = c.echoEvent(event);
    const extra = Math.min(amount, room());
    if (replay && extra > 0) store(item, extra, replay);
  }
  const rations = c.equipment.find((item) => item.ruleId === 'RATIONS');
  const total = Math.min(c.virtualFood, room());
  if (!rations || !cooks.length || total <= 0) return;
  const share = Math.floor(total / cooks.length);
  let remainder = combatNumber(total - share * cooks.length);
  const event = c.equipmentEvent(5, rations, []);
  for (const item of cooks) {
    const extra = Math.min(1, remainder);
    remainder = combatNumber(remainder - extra);
    const amount = share + extra;
    if (amount > 0) {
      event.participantDiceIds.push(item.diceId);
      store(item, amount, event);
    }
  }
}
