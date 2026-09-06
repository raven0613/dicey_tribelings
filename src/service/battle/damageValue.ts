import { combatNumber } from './creatures/creatureState';

/** Apply the combat precision before rounding each outgoing hit up to an integer. */
export const ceilDamage = (value: number) => Math.ceil(combatNumber(value));
