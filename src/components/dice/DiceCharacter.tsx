import { useLayoutEffect, useRef } from 'react';
import { DICE_CHARACTER_LAYERS, DICE_CHARACTER_PRESENTATION, DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import { CREATURE_CONFIG } from '../../configs/creatures/creatureConfig';
import type { CreatureId } from '../../types/creatures';
import { getCharacterEntrancePaths } from '../../service/dice/characterEntrancePath';

const art = DICE_CHARACTER_PRESENTATION.gang;
const canvasSize = DICE_FACE_PRESENTATION.viewBoxSize;
const paths = getCharacterEntrancePaths(art.start, art.control, art.press);
const travelMs = art.durationMs - art.pressHoldMs - art.reboundMs;
const riseMs = travelMs * art.riseFraction;

export function DiceCharacter({ creature, rolling = false, reducedMotion = false, animate = true }: {
  creature: CreatureId; rolling?: boolean; reducedMotion?: boolean; animate?: boolean;
}) {
  const motionRef = useRef<SVGAnimationElement>(null);
  const risePathRef = useRef<SVGPathElement>(null);
  const curvePathRef = useRef<SVGPathElement>(null);
  const completePathRef = useRef<SVGPathElement>(null);
  const wasRolling = useRef(rolling);
  const motionEnabled = creature === 'gang' && animate && !reducedMotion;
  useLayoutEffect(() => {
    const motion = motionRef.current;
    if (rolling && !wasRolling.current && motion) {
      motion.setAttribute('fill', 'remove');
      motion.endElement();
    }
    if (wasRolling.current && !rolling && motion) {
      const length = completePathRef.current!.getTotalLength();
      const peak = risePathRef.current!.getTotalLength() / length;
      const press = curvePathRef.current!.getTotalLength() / length;
      motion.setAttribute('keyPoints', `0;${peak};${press};${press};1`);
      motion.setAttribute('fill', 'freeze');
      motion.beginElement();
    }
    wasRolling.current = rolling;
  }, [rolling, motionEnabled]);

  const layers = DICE_CHARACTER_LAYERS[creature];
  if (!layers) return <text x="46" y="59" textAnchor="middle" className="battle-die-creature">
    {CREATURE_CONFIG[creature].emoji}
  </text>;
  return <>
    {motionEnabled && <defs>
      <path ref={risePathRef} d={paths.rise} />
      <path ref={curvePathRef} d={paths.curve} />
      <path ref={completePathRef} d={paths.complete} />
    </defs>}
    {layers.map((source, index) => motionEnabled && index === art.movingLayer
      ? <g key={source} transform={rolling ? `translate(${art.start.x} ${art.start.y})` : undefined}>
        <image href={source} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet">
          <animateMotion ref={motionRef} begin="indefinite" dur={`${art.durationMs}ms`} fill="freeze"
            path={paths.complete} rotate="0" calcMode="spline"
            keyTimes={`0;${riseMs / art.durationMs};${travelMs / art.durationMs};${(travelMs + art.pressHoldMs) / art.durationMs};1`}
            keySplines={`${art.riseEasing};${art.pressEasing};0 0 1 1;${art.reboundEasing}`} />
        </image>
      </g> : <image key={source} href={source} x="0" y="0" width={canvasSize} height={canvasSize} preserveAspectRatio="xMidYMid meet" />)}
  </>;
}
