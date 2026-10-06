export type ArrowId = 'arrowUp' | 'arrowDown' | 'arrowLeft' | 'arrowRight';

export type CreatureId = ArrowId | 'blank'
  | 'family' | 'sisters' | 'twins' | 'gang' | 'boss' | 'loner' | 'chef'
  | 'porter' | 'follower' | 'cheerleader' | 'thief' | 'coward' | 'guard'
  | 'warrior' | 'elder' | 'artisan' | 'priest' | 'knight' | 'teacher'
  | 'royalGuard' | 'prankster' | 'authority' | 'farmer' | 'imposter'
  | 'detective' | 'fruit' | 'glutton' | 'bulwark' | 'bully' | 'herald' | 'princess' | 'food';

export type PermanentCreatureId = Exclude<CreatureId, ArrowId | 'blank'>;

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

export interface CreatureBattleState {
  round: number;
  inheritance: Record<string, number>;
  firstRerollUsed: boolean;
  firstRerollMemory: Record<string, number>;
  rerollBonuses: { diceId: string; damage: number }[];
  controlPayments: number[];
  chargeLayers: Record<string, number>;
  absorbTarget: string | null;
  splitEnabled: boolean;
  firstBonusUsed: boolean;
  identityChanges: number;
  identitySnapshot: Record<string, string>;
  manualRerolls: number;
  watchedDieId?: string;
  rollOrigins: Record<string, number>;
  sealedDice?: string[];
  rerolledDice?: string[];
  imposterTargets: Record<string, CreatureId>;
  imposterCandidates: Record<string, CreatureId[]>;
  echoUsed: string[];
  rerollEchoes?: { diceId: string; skill: CreatureId }[];
  gildedFaces: string[];
  storedFood: Record<string, number>;
  cowardShields: Record<string, number>;
  altars: Record<string, number>;
  teacherBonuses: Record<string, number>;
  teachersAvailable: string[];
  prankstersUsed: string[];
  faceVersions: Record<string, number>;
  lockedDice: string[];
  rerollCount: number;
  controlSpent: number;
  paidRerolls: number;
  paidRerollUsed: boolean;
  formationUsed: boolean;
  whistleUsed: boolean;
  pipeUsed: boolean;
  roundSeed: number;
  seed: number;
  initialRations: Record<string, number>;
}
