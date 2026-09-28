import type { Dice } from '../../types/game';
import { configuredDice } from '../../service/dice/diceFactory';

export const STARTER_IDENTITY: { id: string; name: string; dice: Dice[] } = {
  id: 'guard_expedition', name: '護衛遠征隊', dice: [
    configuredDice('starter_companion', '同伴骰', 'd6', 'emerald', [
      ['family', 3], ['family', 3], ['family', 3], ['twins', 3], ['twins', 3], ['coward', 3],
    ]),
    configuredDice('starter_front', '前鋒骰', 'd6', 'ruby', [
      ['warrior', 4], ['warrior', 4], ['warrior', 4], ['guard', 3], ['guard', 3], ['guard', 3],
    ]),
    configuredDice('starter_support', '援護骰', 'd6', 'sapphire', [
      ['follower', 3], ['follower', 3], ['artisan', 3], ['artisan', 3], ['teacher', 3], ['teacher', 3],
    ]),
  ],
};
export const INITIAL_DICE_POOL = STARTER_IDENTITY.dice;
