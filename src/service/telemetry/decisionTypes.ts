import type { CreatureId } from '../../types/creatures';
import type { RunLocation } from './types';
import type { ACTIVITY_LABELS, DECISION_LABELS } from '../../configs/telemetryConfig';

export type Activity = keyof typeof ACTIVITY_LABELS;
export type ActivityTotals = Record<Activity, number>;
export type OfferSource = 'shop' | 'reward' | 'chest' | 'camp' | 'dice';
export interface RecordedItem {
  id: string;
  name: string;
  instanceId?: string;
  creature?: string;
  material?: string;
  description?: string;
  rarity?: string;
}
export interface OfferOption {
  id: string;
  name: string;
  price?: number;
  visibleItems: RecordedItem[];
  hiddenCount: number;
}
export interface OfferRecord {
  id: number;
  at: number;
  activeMs: number;
  location: RunLocation;
  source: OfferSource;
  options: OfferOption[];
}
export interface StickerPosition {
  kind: 'pending' | 'permanentBag' | 'temporaryBag' | 'face' | 'temporaryFace';
  diceId?: string;
  diceName?: string;
  faceIndex?: number;
  direction?: string;
}
export interface StickerChange {
  item: RecordedItem;
  from: StickerPosition | null;
  to: StickerPosition | null;
}
export interface ResourceChange {
  gold: { before: number; after: number };
  hp: { before: number; after: number };
  control: { before: number; after: number };
}
export interface RerollDetail {
  diceId: string;
  diceName: string;
  reason: 'manual' | 'teacher' | 'chain';
  teacherId?: string;
  before: { faceIndex: number; creature: CreatureId; baseValue: number };
  after: { faceIndex: number; creature: CreatureId; baseValue: number };
  rolledFaceIndex: number;
}
export interface EnemyActionRecord {
  enemyId: string;
  enemyName: string;
  intent: string;
  source: 'intent' | 'grapple';
  hits: number;
  damage: number;
  hpLoss: number;
  absorbed: number;
  counterTriggered: boolean;
  cancelled: boolean;
}
export interface DecisionInput {
  kind: keyof typeof DECISION_LABELS;
  source: OfferSource | 'backpack' | 'battle' | 'route';
  choiceId?: string;
  label?: string;
  items?: RecordedItem[];
  rerolls?: RerollDetail[];
}
export interface DecisionCommit extends DecisionInput {
  location: RunLocation;
  round?: number;
  resources: ResourceChange;
  changes: StickerChange[];
}
export interface DecisionRecord extends DecisionCommit {
  id: number;
  at: number;
  activeMs: number;
  offerId?: number;
}
