export type CreatureId =
  | 'family' | 'sisters' | 'twins' | 'gang' | 'boss' | 'loner' | 'chef'
  | 'porter' | 'follower' | 'cheerleader' | 'thief' | 'coward' | 'guard'
  | 'warrior' | 'elder' | 'artisan' | 'priest' | 'knight' | 'teacher'
  | 'royalGuard' | 'prankster' | 'authority' | 'farmer' | 'imposter'
  | 'detective' | 'fruit' | 'glutton' | 'bulwark' | 'bully' | 'herald' | 'princess' | 'food';

export type CreatureTag = 'common' | 'warrior' | 'craftsman' | 'noble' | 'mystery' | 'food';

export interface CreatureDefinition {
  rarity: 'common' | 'rare' | 'legendary';
  name: string;
  emoji: string;
  color: string;
  tags: readonly CreatureTag[];
  ability: string;
  description: string;
}

export interface AuthorityTarget { diceId: string; version: number }

export interface CreatureBattleState {
  round: number;
  sealedDice?: string[];
  rerolledDice?: string[];
  imposterTargets: Record<string, CreatureId>;
  echoUsed: string[];
  gildedFaces: string[];
  storedFood: Record<string, number>;
  cowardShields: Record<string, number>;
  altars: Record<string, number>;
  teacherBonuses: Record<string, number>;
  teachersAvailable: string[];
  prankstersUsed: string[];
  faceVersions: Record<string, number>;
  authorityTargets: Record<string, AuthorityTarget>;
  lockedDice: string[];
  rerollCount: number;
  controlSpent: number;
  paidRerolls: number;
  paidRerollUsed: boolean;
  formationUsed: boolean;
  whistleUsed: boolean;
  pipeUsed: boolean;
  seed: number;
  virtualFood: number;
}
