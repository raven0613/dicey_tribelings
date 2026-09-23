import type { Dice } from '../../types/game';
import { configuredDice } from '../../service/dice/diceFactory';

export const INITIAL_DICE_POOL: Dice[] = [
  configuredDice('dice_starter_1', '家族骰', 'd6', 'emerald', [
    ['family', 2], ['family', 2], ['sisters', 3], ['coward', 3], ['gang', 3], ['guard', 3],
  ]),
  configuredDice('dice_starter_2', '職人骰', 'd6', 'amber', [
    ['chef', 3], ['food', 4], ['farmer', 3], ['food', 4], ['porter', 3], ['sisters', 3],
  ]),
  configuredDice('dice_starter_3', '勇士骰', 'd6', 'sapphire', [
    ['boss', 3], ['warrior', 4], ['follower', 3], ['thief', 3], ['prankster', 2], ['loner', 3],
  ]),
];
