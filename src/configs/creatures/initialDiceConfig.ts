import { fixedDice } from '../../service/dice/diceFactory';
export const STARTER_IDENTITY = {
  id: 'guard_expedition', name: '護衛遠征隊', dice: [
    fixedDice('starter_companion', '同伴骰', 'emerald', { 3: 'family', 4: 'gang' }),
    fixedDice('starter_front', '前鋒骰', 'ruby', { 1: 'fruit', 4: 'warrior' }),
    fixedDice('starter_support', '援護骰', 'sapphire', { 2: 'follower', 3: 'coward' }),
  ],
};
export const INITIAL_DICE_POOL = STARTER_IDENTITY.dice;
