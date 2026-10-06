import { fixedDice } from '../../dice/diceFactory';
import type { CreatureId } from '../../../types/creatures';
import { D6_FACE_VALUES } from '../../../configs/creatures/diceValueConfig';
import { ALL_EQUIPMENT_CATALOG } from '../../../configs/equipment/equipmentConfig';
import { calculateRollResolution } from '../battleEngine';
import { createCreatureBattleState } from './creatureState';
import type { BattleContext } from '../../../types/battle';
export const faceIndex = (pip: number) => D6_FACE_VALUES.indexOf(pip as typeof D6_FACE_VALUES[number]);
export const die = (id: string, roles: Partial<Record<number, CreatureId>>) => fixedDice(id, id, 'amber', roles);
export const gear = (...rules: string[]) => ALL_EQUIPMENT_CATALOG.filter(item => rules.includes(item.ruleId));
export const resolve = (pool: ReturnType<typeof die>[], pips = pool.map(() => 1), rules: string[] = [],
  state = createCreatureBattleState(), battle: BattleContext = { control: 0, maxControl: 3, gold: 0 }) =>
  calculateRollResolution(pool, pips.map(faceIndex), gear(...rules), state, battle);
