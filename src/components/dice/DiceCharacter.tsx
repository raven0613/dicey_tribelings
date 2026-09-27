import { ARROW_CONFIG, ARROW_PRESENTATION, isArrowFace } from '../../configs/directionalStickerConfig';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { DICE_CHARACTER_LAYERS, DICE_CHARACTER_SEQUENCES, DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { CreatureId } from '../../types/creatures';
import { getCharacterEntranceMotions } from '../../service/dice/characterEntrancePath';
import { DiceCharacterMotionLayer } from './DiceCharacterMotionLayer';
import { DiceCharacterSequenceLayer } from './DiceCharacterSequenceLayer';
import type { CharacterEntranceHandle } from './characterEntranceHandle';

const canvasSize = DICE_FACE_PRESENTATION.viewBoxSize;

export function DiceCharacter({ creature, rolling = false, reducedMotion = false, animate = true }: {
  creature: CreatureId; rolling?: boolean; reducedMotion?: boolean; animate?: boolean;
}) {
  const entranceRefs = useRef(new Map<number, CharacterEntranceHandle>());
  const wasRolling = useRef(rolling);
  const entranceEnabled = animate && !reducedMotion;
  const motions = entranceEnabled ? getCharacterEntranceMotions(creature) : undefined;
  const sequence = entranceEnabled ? DICE_CHARACTER_SEQUENCES[creature] : undefined;
  useLayoutEffect(() => {
    if (rolling && !wasRolling.current) {
      entranceRefs.current.forEach((entrance) => entrance.stop());
    }
    if (wasRolling.current && !rolling) {
      entranceRefs.current.forEach((entrance) => entrance.start());
    }
    wasRolling.current = rolling;
  }, [rolling, motions, sequence]);

  if (isArrowFace(creature)) return <path d="M43 80V39H25L50 14L75 39H57V80Z"
    fill={ARROW_PRESENTATION.color} transform={`rotate(${ARROW_CONFIG[creature].rotation} 50 50)`} />;
  const layers = DICE_CHARACTER_LAYERS[creature];
  if (!layers) return <text x="46" y="59" textAnchor="middle" className="battle-die-creature">
    {CREATURE_CONFIG[creature].emoji}
  </text>;
  const renderLayer = (index: number): ReactNode => {
    const source = layers[index];
    const registerEntrance = (handle: CharacterEntranceHandle | null) => {
      if (handle) entranceRefs.current.set(index, handle);
      else entranceRefs.current.delete(index);
    };
    if (sequence?.frameLayer === index) return <DiceCharacterSequenceLayer key={source}
      sequence={sequence} ref={registerEntrance} />;
    const motion = motions?.find((entry) => entry.movingLayer === index);
    if (!motion) return <image key={source} href={source} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet" />;
    return <DiceCharacterMotionLayer key={source} source={source} motion={motion} rolling={rolling}
      ref={registerEntrance}>
      {motions?.filter((entry) => entry.parentLayer === index).map((entry) => renderLayer(entry.movingLayer))}
    </DiceCharacterMotionLayer>;
  };
  return <>{layers.map((_, index) => {
    const motion = motions?.find((entry) => entry.movingLayer === index);
    return motion?.parentLayer === undefined ? renderLayer(index) : null;
  })}</>;
}
