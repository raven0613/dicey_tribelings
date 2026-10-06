import type { CreatureTag, PermanentCreatureId } from '../../types/creatures';
import { CREATURE_CONFIG, CREATURE_IDS } from './creatureConfig';

export const NORMAL_REWARD_CREATURES = CREATURE_IDS.filter(id => id !== 'princess');
const withTag = (tag: CreatureTag) => NORMAL_REWARD_CREATURES.filter(id => CREATURE_CONFIG[id].tags.includes(tag));
const sameNamePool: PermanentCreatureId[] = ['family', 'gang', 'twins', 'follower', 'artisan', 'farmer'];

export const RELATED_POOLS: Partial<Record<PermanentCreatureId, readonly PermanentCreatureId[]>> = {
  family: ['family', 'fruit', 'knight'],
  twins: ['twins', 'fruit', 'coward'],
  gang: ['gang', 'boss', 'prankster'],
  boss: ['family', 'sisters', 'thief', 'coward'],
  loner: ['fruit', 'cheerleader', 'coward'],
  chef: ['food', 'chef', 'farmer'],
  porter: ['porter', 'artisan', 'fruit'],
  follower: ['warrior', 'follower', 'cheerleader'],
  cheerleader: ['warrior', 'knight', 'cheerleader', 'follower', 'guard'],
  thief: ['boss', 'family', 'thief', 'coward'],
  coward: ['prankster', 'coward', 'artisan'],
  guard: ['family', 'sisters', 'guard', 'knight', 'cheerleader'],
  warrior: ['follower', 'warrior', 'cheerleader'],
  artisan: ['artisan', 'porter', 'farmer'],
  priest: ['prankster', 'coward'],
  knight: ['family', 'sisters', 'cheerleader'],
  teacher: ['coward', 'prankster', 'fruit'],
  prankster: ['coward', 'prankster', 'gang'],
  authority: ['family', 'sisters', 'knight'],
  farmer: ['food', 'fruit', 'chef', 'farmer'],
  glutton: ['food', 'farmer', 'fruit'],
  bulwark: ['artisan', 'coward', 'guard'],
  food: ['chef', 'food', 'farmer'],
  fruit: ['family', 'chef', 'farmer', 'fruit'],
  sisters: ['sisters', 'fruit', 'teacher'],
  elder: sameNamePool,
  imposter: sameNamePool,
  royalGuard: [...withTag('noble'), 'cheerleader'],
  herald: ['gang', 'cheerleader', 'thief', 'chef', 'priest', 'bulwark'],
  detective: [...new Set<PermanentCreatureId>(['boss', 'bully', ...withTag('common')])],
  bully: withTag('craftsman'),
};
