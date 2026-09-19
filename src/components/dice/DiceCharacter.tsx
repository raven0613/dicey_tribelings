import { useLayoutEffect, useRef } from 'react';
import { DICE_CHARACTER_PRESENTATION, DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { CreatureId } from '../../types/creatures';
import { getCharacterEntrancePaths } from '../../service/dice/characterEntrancePath';

const art = DICE_CHARACTER_PRESENTATION.gang;
const canvasSize = DICE_FACE_PRESENTATION.viewBoxSize;
const paths = getCharacterEntrancePaths(art.start, art.control, art.press);
const travelMs = art.durationMs - art.pressHoldMs - art.reboundMs;
const riseMs = travelMs * art.riseFraction;

export function DiceCharacter({ creature, rolling = false, reducedMotion = false }: {
  creature: CreatureId; rolling?: boolean; reducedMotion?: boolean;
}) {
  const motionRef = useRef<SVGAnimationElement>(null);
  const risePathRef = useRef<SVGPathElement>(null);
  const curvePathRef = useRef<SVGPathElement>(null);
  const completePathRef = useRef<SVGPathElement>(null);
  const wasRolling = useRef(rolling);
  useLayoutEffect(() => {
    const motion = motionRef.current;
    if (rolling && !wasRolling.current && motion) {
      motion.setAttribute('fill', 'remove');
      motion.endElement();
    }
    if (wasRolling.current && !rolling && !reducedMotion && motion) {
      const length = completePathRef.current!.getTotalLength();
      const peak = risePathRef.current!.getTotalLength() / length;
      const press = curvePathRef.current!.getTotalLength() / length;
      motion.setAttribute('keyPoints', `0;${peak};${press};${press};1`);
      motion.setAttribute('fill', 'freeze');
      motion.beginElement();
    }
    wasRolling.current = rolling;
  }, [rolling, reducedMotion]);

  if (creature !== 'gang') return <text x="46" y="59" textAnchor="middle" className="battle-die-creature">
    {CREATURE_CONFIG[creature].emoji}
  </text>;
  return <>
    <defs>
      <path ref={risePathRef} d={paths.rise} />
      <path ref={curvePathRef} d={paths.curve} />
      <path ref={completePathRef} d={paths.complete} />
    </defs>
    <image href={art.face} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet" />
    <g transform={rolling && !reducedMotion ? `translate(${art.start.x} ${art.start.y})` : undefined}>
      <image href={art.hand} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet">
        <animateMotion ref={motionRef} begin="indefinite" dur={`${art.durationMs}ms`} fill="freeze"
          path={paths.complete} rotate="0" calcMode="spline"
          keyTimes={`0;${riseMs / art.durationMs};${travelMs / art.durationMs};${(travelMs + art.pressHoldMs) / art.durationMs};1`}
          keySplines={`${art.riseEasing};${art.pressEasing};0 0 1 1;${art.reboundEasing}`} />
      </image>
    </g>
  </>;
}
