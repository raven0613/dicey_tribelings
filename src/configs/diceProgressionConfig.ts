import type { Dice } from '../types/game';
import { configuredDice } from '../service/dice/diceFactory';

export const PROGRESSION_DICE_REWARDS: Record<number, Dice> = {
  1: configuredDice('dice_family_d6', '土人同盟骰', 'd6', 'emerald', [
    ['family', 7], ['family', 8], ['gang', 8], ['sisters', 9], ['coward', 10], ['food', 12],
  ]),
  5: configuredDice('dice_royal_d8', '王庭遠征骰', 'd8', 'obsidian', [
    ['porter', 6], ['porter', 7], ['royalGuard', 8], ['priest', 9], ['chef', 10], ['food', 11], ['thief', 12], ['warrior', 14],
  ]),
};
