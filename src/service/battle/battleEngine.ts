import { resolveLandingFace } from '../dice/directionalFaces';
import { buildAttackPlan } from './attackPlan';
import type { Dice, Equipment } from '../../types/game';
import type { CreatureBattleState } from '../../types/creatures';
import type { BattleComboSummary, BattleContext } from '../../types/battle';
import { createCreatureBattleState, choose, combatNumber } from './creatures/creatureState';
import { createResolutionContext } from './creatures/resolutionContext';
import { resolveCreatures } from './creatures/creatureResolution';
import { EQUIPMENT_BALANCE as eq, hasEquipment } from '../../configs/equipment/equipmentConfig';

export type { BattleComboSummary, CalculatedRollItem } from '../../types/battle';
export function predetermineRollResults(dicePool: Dice[], random: () => number = Math.random): number[] {
  return dicePool.map((die) => Math.floor(random() * die.faces.length));
}

/** Pure calculation shared by Control previews and committed combat resolution. */
export function calculateRollResolution(dicePool: Dice[], rolledIndices: number[], equipments: Equipment[],
  state: CreatureBattleState = createCreatureBattleState(),
  battle: BattleContext = { control: 0, maxControl: 3, gold: 0 }): BattleComboSummary {
  const settled = rolledIndices.map((index, i) => resolveLandingFace(dicePool[i], index));
  const c = createResolutionContext(dicePool, settled, equipments, state, battle);
  const { captures } = resolveCreatures(c);
  const tags = new Set(c.items.flatMap((item) => item.tags.filter((tag) => tag !== 'food')));
  const bonusControlGranted = hasEquipment(equipments, 'ABACUS') && tags.size >= eq.abacusTags ? eq.abacusControl : 0;
  const goldGranted = captures && hasEquipment(equipments, 'PURSE')
    ? choose(Array.from({ length: eq.stolenGoldMax - eq.stolenGoldMin + 1 }, (_, index) => eq.stolenGoldMin + index), state.seed, 'purse')! : 0;
  if (bonusControlGranted) c.triggeredEquipmentIds.add(equipments.find((item) => item.ruleId === 'ABACUS')!.id);
  if (goldGranted) c.triggeredEquipmentIds.add(equipments.find((item) => item.ruleId === 'PURSE')!.id);
  const totalDamage = combatNumber(buildAttackPlan(c, battle.currentEnemy && 'id' in battle.currentEnemy ? battle.currentEnemy : battle.currentEnemy?.shield ?? 0, equipments)
    .reduce((sum, attack) => sum + attack.value, 0));
  for (const event of c.events) event.activated ||= Boolean(event.bonusIds.length || event.changes.length || event.identities.length || event.repeatDiceIds.length);
  return { items: c.items, bonusDice: c.bonusDice, repeatAttacks: c.repeatAttacks,
    events: c.events.filter((event) => event.activated),
    triggeredEquipmentIds: [...c.triggeredEquipmentIds], totalDamage,
    totalShield: combatNumber(c.items.reduce((sum, item) => sum + item.shieldGranted, c.teamShield.value)),
    healing: c.materials.healing, reflection: c.materials.reflection, nextEchoUsed: [...c.echoUsed],
    nextGildedFaces: [...c.materials.gildedFaces],
    bonusControlGranted, goldGranted, nextStoredFood: c.nextStoredFood, nextAltars: c.nextAltars,
    virtualFood: c.virtualFood,
    leftoverFood: combatNumber(c.items.filter((item) => item.tags.includes('food')).reduce((sum, item) => sum + c.foodValues[item.diceId], 0)),
  };
}
