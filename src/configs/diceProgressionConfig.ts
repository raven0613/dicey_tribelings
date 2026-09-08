import type { Dice } from '../types/game';
import { configuredDice } from '../service/dice/diceFactory';

/** 三骰起步，於第一、二、三、五區各擴編一次；新骰品質不隨區域升高。 */
export const PROGRESSION_DICE_REWARDS: Readonly<Partial<Record<number, Dice>>> = {
  1: configuredDice('dice_family', '同盟骰', 'd6', 'emerald', [
    ['family', 3], ['family', 3], ['sisters', 4], ['gang', 3], ['coward', 3], ['food', 4],
  ]),
  8: configuredDice('dice_support', '支援骰', 'd6', 'sapphire', [
    ['warrior', 4], ['follower', 3], ['follower', 3], ['guard', 3], ['artisan', 2], ['porter', 3],
  ]),
  17: configuredDice('dice_court', '護衛骰', 'd6', 'obsidian', [
    ['royalGuard', 3], ['knight', 3], ['guard', 3], ['priest', 2], ['elder', 2], ['warrior', 4],
  ]),
  28: configuredDice('dice_supply', '糧隊骰', 'd6', 'amber', [
    ['chef', 3], ['food', 4], ['food', 4], ['farmer', 3], ['porter', 3], ['thief', 3],
  ]),
};
