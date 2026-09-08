import type { Dice } from '../types/game';
import { configuredDice } from '../service/dice/diceFactory';

export const PROGRESSION_DICE_REWARDS: Record<number, Dice> = {
  1: configuredDice('dice_family', '同盟骰', 'd6', 'emerald', [
    ['family', 3], ['family', 3], ['sisters', 4], ['gang', 3], ['coward', 3], ['food', 4],
  ]),
  8: configuredDice('dice_support', '支援骰', 'd6', 'sapphire', [
    ['warrior', 5], ['follower', 5], ['follower', 5], ['guard', 5], ['artisan', 5], ['porter', 6],
  ]),
  13: configuredDice('dice_supply', '糧隊骰', 'd6', 'amber', [
    ['chef', 6], ['food', 6], ['food', 6], ['farmer', 5], ['porter', 6], ['thief', 5],
  ]),
  14: configuredDice('dice_gang', '先鋒骰', 'd6', 'ruby', [
    ['gang', 6], ['gang', 6], ['gang', 6], ['boss', 7], ['thief', 7], ['sisters', 7],
  ]),
  17: configuredDice('dice_court', '護衛骰', 'd6', 'obsidian', [
    ['royalGuard', 7], ['knight', 7], ['guard', 7], ['priest', 6], ['elder', 6], ['warrior', 8],
  ]),
  24: configuredDice('dice_workers', '工班骰', 'd6', 'amber', [
    ['porter', 9], ['porter', 9], ['chef', 9], ['food', 10], ['artisan', 8], ['teacher', 8],
  ]),
  28: configuredDice('dice_rescue', '救援骰', 'd6', 'gold', [
    ['sisters', 10], ['family', 10], ['warrior', 11], ['follower', 10], ['coward', 9], ['farmer', 10],
  ]),
};
