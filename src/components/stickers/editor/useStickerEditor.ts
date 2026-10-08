import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../../store/gameStore';
import { ARROW_IDS, DIRECTIONAL_STICKER } from '../../../configs/directionalStickerConfig';
import { BACKPACK_PRESENTATION, INVENTORY_CONFIG } from '../../../configs/inventoryConfig';
import {
  applyTemporaryPlacements,
  resolveTemporarySticker,
} from '../../../service/inventory/inventoryService';
import { getArrowConfigurationError } from '../../../service/dice/directionalFaces';
import { canEditStickers, transferFaceSticker } from '../../../service/inventory/backpack';
import { getFaceSticker } from '../../../service/inventory/stickerInstances';
import { getEffectiveFace } from '../../../service/dice/diceFaces';
import type { ArrowId } from '../../../types/creatures';
import type { ConsumableSticker, FaceSticker, OwnedSticker } from '../../../types/game';

export type StickerSource =
  | { kind: 'inventory'; id: string }
  | { kind: 'incoming'; id: string }
  | { kind: 'face'; diceId: string; faceIndex: number };

const ownedTemporary = (item: ConsumableSticker): OwnedSticker => ({
  ...item,
  id: item.stickerId,
  isDisposable: true,
});

export function useStickerEditor(incoming?: OwnedSticker) {
  const state = useGameStore(
    useShallow((s) => ({
      dicePool: s.dicePool,
      consumables: s.consumableStickers,
      permanents: s.permanentStickers,
      placements: s.temporaryPlacements,
      phase: s.combatPhase,
      hasEnemy: s.enemies.length > 0,
    })),
  );
  const [selection, setSelection] = useState<StickerSource | null>(null);
  const [diceId, setDiceId] = useState(state.dicePool[0].id);
  const [faceIndex, setFaceIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<ArrowId>(DIRECTIONAL_STICKER.defaultDirection);
  const [error, setError] = useState('');
  const editable = canEditStickers(state.phase, state.hasEnemy);
  const facePlacement = (source: Extract<StickerSource, { kind: 'face' }>) =>
    state.placements.find((p) => p.diceId === source.diceId && p.faceIndex === source.faceIndex);
  const sourceSticker = (source: StickerSource): OwnedSticker | null => {
    if (source.kind === 'incoming') return incoming?.instanceId === source.id ? incoming : null;
    if (source.kind === 'inventory') {
      const temporary = state.consumables.find((item) => item.instanceId === source.id);
      return (
        state.permanents.find((item) => item.instanceId === source.id) ??
        (temporary ? ownedTemporary(temporary) : null)
      );
    }
    const cover = facePlacement(source);
    const face = state.dicePool.find((die) => die.id === source.diceId)?.faces[source.faceIndex];
    return cover ? ownedTemporary(cover.consumable) : face ? getFaceSticker(face) : null;
  };
  const selected = selection ? sourceSticker(selection) : null;
  const directional = selected?.creature === 'directional';
  const targetDie = state.dicePool.find((item) => item.id === diceId) ?? state.dicePool[0];
  const transfer =
    selection?.kind === 'face' && faceIndex !== null
      ? transferFaceSticker(
          state.dicePool,
          state.placements,
          selection.diceId,
          selection.faceIndex,
          targetDie.id,
          faceIndex,
        )
      : null;
  const previewPool = transfer
    ? applyTemporaryPlacements(transfer.dicePool, transfer.temporaryPlacements)
    : applyTemporaryPlacements(
        state.dicePool,
        selection?.kind === 'face'
          ? state.placements
          : state.placements.filter((item) => item.consumable.instanceId !== selected?.instanceId),
      );
  const die = previewPool.find((item) => item.id === diceId) ?? previewPool[0];
  const matchCounts =
    selected && !directional
      ? Object.fromEntries(
          previewPool.map((item) => [
            item.id,
            item.faces.filter((face) => getEffectiveFace(face).creature === selected.creature)
              .length,
          ]),
        )
      : undefined;
  const sticker: FaceSticker | undefined = selected
    ? selected.isDisposable === true
      ? { ...selected, ...resolveTemporarySticker(selected, direction) }
      : selected
    : undefined;
  const selectSource = (source: StickerSource) => {
    if (!editable) return;
    const item = sourceSticker(source);
    if (!item) return;
    const placed = state.placements.find((p) => p.consumable.instanceId === item.instanceId);
    setSelection(source);
    if (source.kind === 'face' || selected?.instanceId !== item.instanceId)
      setDirection(placed?.direction ?? DIRECTIONAL_STICKER.defaultDirection);
    setFaceIndex(null);
    setError('');
  };
  const select = (id: string) =>
    selectSource({
      kind: incoming?.instanceId === id ? 'incoming' : 'inventory',
      id,
    });
  const placementError = (index: number): string | null => {
    if (!selected || !selection) return null;
    if (selection.kind === 'face') {
      const result = transferFaceSticker(
        state.dicePool,
        state.placements,
        selection.diceId,
        selection.faceIndex,
        die.id,
        index,
      );
      return result
        ? getArrowConfigurationError(
            applyTemporaryPlacements(result.dicePool, result.temporaryPlacements),
          )
        : null;
    }
    if (!selected.isDisposable) {
      const target = state.dicePool.find((item) => item.id === die.id)!.faces[index];
      return selection.kind === 'incoming' &&
        state.permanents.length >= INVENTORY_CONFIG.permanentCapacity &&
        getFaceSticker(target)
        ? BACKPACK_PRESENTATION.fullMessage
        : null;
    }
    const consumable = state.consumables.find((item) => item.instanceId === selected.instanceId)!;
    const placements = [
      ...state.placements.filter(
        (item) =>
          item.consumable.instanceId !== selected.instanceId &&
          !(item.diceId === die.id && item.faceIndex === index),
      ),
      { consumable, diceId: die.id, faceIndex: index, ...(directional ? { direction } : {}) },
    ];
    return getArrowConfigurationError(applyTemporaryPlacements(state.dicePool, placements));
  };
  const cancel = () => {
    setSelection(null);
    setError('');
  };
  const applyAt = (source: StickerSource, targetDiceId: string, index: number) => {
    if (!editable) return false;
    const store = useGameStore.getState();
    const applied =
      source.kind === 'face'
        ? store.moveFaceSticker(source.diceId, source.faceIndex, targetDiceId, index)
        : source.kind === 'incoming'
          ? store.applyCurrentSticker(targetDiceId, index, direction)
          : store.placeInventorySticker(source.id, targetDiceId, index, direction);
    if (applied) cancel();
    else setError('無法貼到此面，請檢查容量與方向。');
    return applied;
  };
  const storeSource = (source: StickerSource) => {
    if (!editable) return false;
    const store = useGameStore.getState();
    const placed =
      source.kind === 'inventory'
        ? state.placements.find((p) => p.consumable.instanceId === source.id)
        : undefined;
    const stored =
      source.kind === 'face'
        ? store.takeFaceSticker(source.diceId, source.faceIndex)
        : source.kind === 'incoming'
          ? store.storeFlowSticker(store.stickerFlow!.index)
          : placed
            ? store.takeFaceSticker(placed.diceId, placed.faceIndex)
            : true;
    if (stored) cancel();
    else setError(BACKPACK_PRESENTATION.fullMessage);
    return stored;
  };
  return {
    ...state,
    editable,
    incoming,
    selected,
    selectedId: selected?.instanceId ?? null,
    selection,
    select,
    selectSource,
    sourceSticker,
    die,
    previewPool,
    matchCounts,
    sticker,
    directional,
    direction,
    setDirection,
    faceIndex,
    setFaceIndex,
    apply: (index: number) => selection && applyAt(selection, die.id, index),
    applyAt,
    storeSource,
    placementError,
    error,
    setError,
    cancel,
    chooseDie: (id: string) => {
      setDiceId(id);
      setFaceIndex(null);
    },
    rotate: () =>
      setDirection((current) => ARROW_IDS[(ARROW_IDS.indexOf(current) + 1) % ARROW_IDS.length]),
  };
}
