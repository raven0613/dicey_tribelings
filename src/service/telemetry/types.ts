import type { CreatureBattleState, CreatureId } from '../../types/creatures';
import type { ConsumableSticker, Dice, Equipment, MapNode, CombatPhase } from '../../types/game';
import type { Enemy } from '../../types/enemy';
import type { SkillEvent } from '../../types/battle';
import type { RUN_RESULT_LABELS, SNAPSHOT_LABELS } from '../../configs/telemetryConfig';
import type { GameState } from '../../store/gameStore.types';

export type TelemetryState = Pick<GameState, 'playerHp' | 'maxHp' | 'gold' | 'control' | 'playerShield' |
  'dicePool' | 'equipments' | 'consumableStickers' | 'mapNodes' | 'currentNodeIndex' | 'currentEnemy' |
  'combatPhase' | 'rolledIndices' | 'creatureBattleState' | 'comboSummary' | 'combatImpact'>;

export interface CompositionItem { creatureId: CreatureId; name: string; faces: number; totalFaces: number; percent: number }
export interface RunLocation {
  nodeId: number; title: string; region: number; regionName: string; type: MapNode['type']; route?: MapNode['route'];
}
export interface CombatSnapshot {
  hp: number; maxHp: number; shield: number; gold: number; control: number;
  phase: CombatPhase; rolledIndices: number[]; creatureState: CreatureBattleState; enemy: Enemy | null;
}
export interface BuildSnapshot {
  id: number; at: number; elapsedMs: number; activeMs: number; reason: keyof typeof SNAPSHOT_LABELS;
  location: RunLocation;
  dice: (Omit<Dice, 'faces'> & { position: number; faces: (Dice['faces'][number] & {
    index: number; name: string; materialName: string | null; effectiveCreature: CreatureId; effectiveName: string; effectiveBaseValue: number;
  })[] })[];
  composition: CompositionItem[];
  equipments: Equipment[]; consumables: ConsumableSticker[]; combat: CombatSnapshot;
}
export interface RoundRecord {
  round: number; startedAt: number; endedAt: number | null; rerolls: number; settled: boolean;
  output: number; damageHp: number; damageShield: number; takenHp: number; absorbed: number; healing: number;
  bonusAttacks: number; repeatAttacks: number; skills: SkillEvent[];
  before: CombatSnapshot; after: CombatSnapshot | null;
}
export interface BattleRecord {
  id: number; location: RunLocation; enemyId: string; enemyName: string;
  startedAt: number; endedAt: number | null; elapsedMs: number; activeMs: number; activeStartedMs: number;
  outcome: 'incomplete' | 'victory' | 'death' | 'round_limit';
  startSnapshotId: number; endSnapshotId: number | null; rerolls: number; rounds: RoundRecord[];
  death: { phase: CombatPhase; intent: string; source: string; beforeHit: CombatSnapshot; afterHit: CombatSnapshot } | null;
}
export interface EquipmentHistory {
  equipmentId: string; name: string; source: string; acquiredAt: number; acquiredActiveMs: number;
  acquiredLocation: RunLocation; removedAt: number | null; removedLocation: RunLocation | null;
  replacementId: string | null; heldMs: number; battles: number;
}
export interface MilestoneRecord {
  kind: 'region' | 'chapter' | 'run'; name: string; at: number; elapsedMs: number; activeMs: number; snapshotId: number;
}
export interface RunRecord {
  id: string; schemaVersion: number; gameVersion: string; balanceVersion: string;
  country: null; platform: string; content: { id: string; name: string; chapterId: string; chapterName: string; difficulty: number };
  startedAt: number; updatedAt: number; endedAt: number | null; elapsedMs: number; activeMs: number;
  result: keyof typeof RUN_RESULT_LABELS;
  location: RunLocation; visits: { location: RunLocation; at: number; activeMs: number }[];
  snapshots: BuildSnapshot[]; battles: BattleRecord[]; equipmentHistory: EquipmentHistory[]; milestones: MilestoneRecord[];
}
