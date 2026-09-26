import { ARROW_CONFIG, ARROW_PRESENTATION, isArrowFace } from '../../configs/directionalStickerConfig';
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { DICE_CHARACTER_LAYERS, DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { CreatureId } from '../../types/creatures';
import { getCharacterEntranceMotions } from '../../service/dice/characterEntrancePath';
import { DiceCharacterMotionLayer, type CharacterEntranceHandle } from './DiceCharacterMotionLayer';

const canvasSize = DICE_FACE_PRESENTATION.viewBoxSize;

export function DiceCharacter({ creature, rolling = false, reducedMotion = false, animate = true }: {
  creature: CreatureId; rolling?: boolean; reducedMotion?: boolean; animate?: boolean;
}) {
  const motionRefs = useRef(new Map<number, CharacterEntranceHandle>());
  const wasRolling = useRef(rolling);
  const motions = animate && !reducedMotion ? getCharacterEntranceMotions(creature) : undefined;
  useLayoutEffect(() => {
    if (rolling && !wasRolling.current) {
      motionRefs.current.forEach((motion) => motion.stop());
    }
    if (wasRolling.current && !rolling) {
      motionRefs.current.forEach((motion) => motion.start());
    }
    wasRolling.current = rolling;
  }, [rolling, motions]);

  if (isArrowFace(creature)) return <path d="M43 80V39H25L50 14L75 39H57V80Z"
    fill={ARROW_PRESENTATION.color} transform={`rotate(${ARROW_CONFIG[creature].rotation} 50 50)`} />;
  const layers = DICE_CHARACTER_LAYERS[creature];
  if (!layers) return <text x="46" y="59" textAnchor="middle" className="battle-die-creature">
    {CREATURE_CONFIG[creature].emoji}
  </text>;
  const renderLayer = (index: number): ReactNode => {
    const source = layers[index];
    const motion = motions?.find((entry) => entry.movingLayer === index);
    if (!motion) return <image key={source} href={source} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet" />;
    return <DiceCharacterMotionLayer key={source} source={source} motion={motion} rolling={rolling}
      ref={(handle) => {
        if (handle) motionRefs.current.set(index, handle);
        else motionRefs.current.delete(index);
      }}>
      {motions?.filter((entry) => entry.parentLayer === index).map((entry) => renderLayer(entry.movingLayer))}
    </DiceCharacterMotionLayer>;
  };
  return <>{layers.map((_, index) => {
    const motion = motions?.find((entry) => entry.movingLayer === index);
    return motion?.parentLayer === undefined ? renderLayer(index) : null;
  })}</>;
}
