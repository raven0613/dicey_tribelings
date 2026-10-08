import { INVENTORY_CONFIG } from '../../configs/inventoryConfig';
import type {
  CombatPhase,
  Dice,
  OwnedPermanentSticker,
  TemporaryStickerPlacement,
} from '../../types/game';
import { applyPermanentSticker } from './inventoryService';
import { getFaceSticker } from './stickerInstances';

export function canEditStickers(phase: CombatPhase, hasEnemy: boolean): boolean {
  return phase !== 'DEFEAT' && (!hasEnemy || phase === 'PREPARATION' || phase === 'VICTORY');
}

/** Transfers the visible layer; permanent faces exchange without passing through inventory. */
export function transferFaceSticker(
  dicePool: Dice[],
  placements: TemporaryStickerPlacement[],
  sourceDiceId: string,
  sourceIndex: number,
  targetDiceId: string,
  targetIndex: number,
) {
  const source = dicePool.find((die) => die.id === sourceDiceId)?.faces[sourceIndex];
  const target = dicePool.find((die) => die.id === targetDiceId)?.faces[targetIndex];
  if (!source || !target) return null;
  const atSource = (p: TemporaryStickerPlacement) =>
    p.diceId === sourceDiceId && p.faceIndex === sourceIndex;
  const atTarget = (p: TemporaryStickerPlacement) =>
    p.diceId === targetDiceId && p.faceIndex === targetIndex;
  const cover = placements.find(atSource);
  if (!cover && !getFaceSticker(source)) return null;
  if (sourceDiceId === targetDiceId && sourceIndex === targetIndex)
    return { dicePool, temporaryPlacements: placements };
  if (cover)
    return {
      dicePool,
      temporaryPlacements: placements.map((p) =>
        atSource(p)
          ? { ...p, diceId: targetDiceId, faceIndex: targetIndex }
          : atTarget(p)
            ? { ...p, diceId: sourceDiceId, faceIndex: sourceIndex }
            : p,
      ),
    };
  return {
    dicePool: dicePool.map((die) => ({
      ...die,
      faces: die.faces.map((face, index) => {
        const incoming =
          die.id === sourceDiceId && index === sourceIndex
            ? target
            : die.id === targetDiceId && index === targetIndex
              ? source
              : null;
        if (!incoming) return face;
        return incoming.creature === 'blank'
          ? { id: face.id, baseValue: face.baseValue, creature: 'blank' as const }
          : { ...incoming, id: face.id, baseValue: face.baseValue };
      }),
    })),
    temporaryPlacements: placements.filter((p) => !atTarget(p)),
  };
}

export function placePermanent(
  dicePool: Dice[],
  inventory: OwnedPermanentSticker[],
  sticker: OwnedPermanentSticker,
  diceId: string,
  faceIndex: number,
) {
  const face = dicePool.find((die) => die.id === diceId)?.faces[faceIndex];
  if (!face) return null;
  const old = getFaceSticker(face);
  const remaining = inventory.filter((item) => item.instanceId !== sticker.instanceId);
  if (remaining.length + Number(Boolean(old)) > INVENTORY_CONFIG.permanentCapacity) return null;
  return {
    dicePool: applyPermanentSticker(dicePool, diceId, faceIndex, sticker),
    permanentStickers: old ? [...remaining, old] : remaining,
  };
}

export function takePermanent(
  dicePool: Dice[],
  inventory: OwnedPermanentSticker[],
  diceId: string,
  faceIndex: number,
) {
  const face = dicePool.find((die) => die.id === diceId)?.faces[faceIndex];
  const sticker = face && getFaceSticker(face);
  if (!sticker || inventory.length >= INVENTORY_CONFIG.permanentCapacity) return null;
  return {
    dicePool: dicePool.map((die) =>
      die.id !== diceId
        ? die
        : {
            ...die,
            faces: die.faces.map((entry, index) =>
              index !== faceIndex
                ? entry
                : { id: entry.id, baseValue: entry.baseValue, creature: 'blank' as const },
            ),
          },
    ),
    permanentStickers: [...inventory, sticker],
  };
}
