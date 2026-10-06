import type { CreatureId } from '../../types/creatures';
import { D6_FACE_VALUES } from './diceValueConfig';
export interface DiceRecipe { id: string; name: string; colorTheme: string; selfStarting: boolean; faces: readonly (readonly [CreatureId, number])[] }
export const DICE_DRAFT_CONFIG = { optionCount: 3 } as const;
export const BOSS_DICE_REWARD = { name: '白板骰', colorTheme: 'sapphire' } as const;
function recipe(id: string, name: string, colorTheme: string, roles: Partial<Record<number, CreatureId>>, selfStarting = false): DiceRecipe {
  return { id, name, colorTheme, selfStarting, faces: D6_FACE_VALUES.map(value => [roles[value] ?? 'blank', value]) };
}
export const ROAD_DICE_RECIPES: readonly DiceRecipe[] = [
  recipe('clan', '宗族骰', 'emerald', { 2: 'family', 4: 'family', 5: 'family' }, true),
  recipe('twins', '雙子骰', 'ruby', { 2: 'twins', 5: 'twins', 3: 'coward' }, true),
  recipe('gang', '混混骰', 'obsidian', { 1: 'gang', 2: 'gang', 3: 'gang' }, true),
  recipe('alliance', '同盟骰', 'emerald', { 2: 'sisters', 4: 'sisters', 1: 'fruit' }),
  recipe('porter', '搬運骰', 'amber', { 2: 'porter', 4: 'porter', 3: 'artisan' }),
  recipe('valor', '勇武骰', 'ruby', { 4: 'warrior', 2: 'follower', 3: 'cheerleader' }),
  recipe('guard', '護衛骰', 'sapphire', { 2: 'guard', 4: 'guard', 3: 'coward' }),
  recipe('works', '工事骰', 'amber', { 1: 'artisan', 2: 'artisan', 3: 'farmer' }, true),
  recipe('kitchen', '廚房骰', 'amber', { 2: 'chef', 4: 'food', 1: 'fruit' }, true),
  recipe('farm', '農園骰', 'amber', { 2: 'farmer', 3: 'farmer', 5: 'chef' }, true),
  recipe('tactics', '調度骰', 'sapphire', { 1: 'teacher', 2: 'prankster', 4: 'coward' }),
  recipe('altar', '祭壇骰', 'obsidian', { 3: 'priest', 1: 'prankster', 4: 'coward' }),
  recipe('robbery', '壞壞骰', 'ruby', { 3: 'boss', 2: 'thief', 5: 'family' }),
  recipe('court', '宮廷骰', 'gold', { 2: 'authority', 4: 'royalGuard', 3: 'knight' }),
];
