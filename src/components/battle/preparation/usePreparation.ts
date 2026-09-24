import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../../store/gameStore';
import { ARROW_IDS, DIRECTIONAL_STICKER } from '../../../configs/directionalStickerConfig';
import { DISPOSABLE_STICKERS } from '../../../configs/creatures/creatureStickerConfig';
import { applyTemporaryPlacements, resolveTemporarySticker } from '../../../service/inventory/inventoryService';
import { getArrowConfigurationError } from '../../../service/dice/directionalFaces';
import type { ArrowId } from '../../../types/creatures';
import type { FaceSticker, TemporaryStickerPlacement } from '../../../types/game';

export function usePreparation() {
  const { dicePool, consumables } = useGameStore(useShallow((state) => ({
    dicePool: state.dicePool, consumables: state.consumableStickers,
  })));
  const [placements, setPlacements] = useState<TemporaryStickerPlacement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [diceId, setDiceId] = useState(dicePool[0].id);
  const [faceIndex, setFaceIndex] = useState<number | null>(null);
  const [direction, setDirection] = useState<ArrowId>(DIRECTIONAL_STICKER.defaultDirection);
  const selected = consumables.find((item) => item.instanceId === selectedId);
  const directional = selected?.creature === 'directional';
  const previewPool = applyTemporaryPlacements(dicePool, placements.filter((item) => item.consumable.instanceId !== selectedId));
  const die = previewPool.find((item) => item.id === diceId) ?? previewPool[0];
  const catalogItem = DISPOSABLE_STICKERS.find((item) => item.id === selected?.stickerId);
  const sticker: FaceSticker | undefined = selected && catalogItem
    ? { ...catalogItem, ...resolveTemporarySticker(selected, direction) } : undefined;

  const select = (id: string) => {
    if (id === selectedId) { setSelectedId(null); return; }
    const placed = placements.find((item) => item.consumable.instanceId === id);
    setSelectedId(id);
    setDirection(placed?.direction ?? DIRECTIONAL_STICKER.defaultDirection);
    setFaceIndex(placed?.faceIndex ?? null);
    if (placed) setDiceId(placed.diceId);
  };
  const candidate = (index: number): TemporaryStickerPlacement[] => [
    ...placements.filter((item) => item.consumable.instanceId !== selectedId
      && !(item.diceId === die.id && item.faceIndex === index)),
    { consumable: selected!, diceId: die.id, faceIndex: index, ...(directional ? { direction } : {}) },
  ];
  const placementError = (index: number) => selected
    ? getArrowConfigurationError(applyTemporaryPlacements(dicePool, candidate(index))) : null;
  const apply = (index: number) => {
    if (!selected || placementError(index)) return;
    setPlacements(candidate(index));
    setSelectedId(null);
  };
  const withdraw = (id: string) => {
    setPlacements((current) => current.filter((item) => item.consumable.instanceId !== id));
    if (selectedId === id) setSelectedId(null);
  };
  const chooseDie = (id: string) => { setDiceId(id); setFaceIndex(null); };
  const rotate = () => setDirection((current) => ARROW_IDS[(ARROW_IDS.indexOf(current) + 1) % ARROW_IDS.length]);

  return { dicePool, consumables, placements, selectedId, selected, directional, direction, setDirection,
    previewPool, die, sticker, faceIndex, setFaceIndex, select, chooseDie, apply, withdraw, placementError,
    rotate, cancel: () => setSelectedId(null) };
}
