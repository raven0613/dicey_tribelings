import { useImperativeHandle, useRef, type ReactNode, type Ref } from 'react';
import { DICE_FACE_PRESENTATION } from '../../configs/dicePresentationConfig';
import type { CharacterEntranceMotion } from '../../service/dice/characterEntrancePath';
import type { CharacterEntranceHandle } from './characterEntranceHandle';

interface DiceCharacterMotionLayerProps {
  source: string;
  motion: CharacterEntranceMotion;
  rolling: boolean;
  ref: Ref<CharacterEntranceHandle>;
  children?: ReactNode;
}

/** All character layers use the same SVG timeline and fixed-angle path playback. */
export function DiceCharacterMotionLayer({ source, motion, rolling, ref, children }: DiceCharacterMotionLayerProps) {
  const animationRef = useRef<SVGAnimationElement>(null);
  const pathsRef = useRef<(SVGPathElement | null)[]>([]);
  useImperativeHandle(ref, () => ({
    start() {
      const lengths = pathsRef.current.map((path) => path!.getTotalLength());
      const totalLength = lengths[lengths.length - 1];
      const animation = animationRef.current!;
      animation.setAttribute('keyPoints', lengths.map((length) => length / totalLength).join(';'));
      animation.setAttribute('fill', 'freeze');
      animation.beginElement();
    },
    stop() {
      const animation = animationRef.current!;
      animation.setAttribute('fill', 'remove');
      animation.endElement();
    },
  }), [motion]);

  const size = DICE_FACE_PRESENTATION.viewBoxSize;
  return <g transform={rolling ? `translate(${motion.start.x} ${motion.start.y})` : undefined}>
    <defs>
      {motion.distancePaths.map((path, index) => <path key={index} d={path}
        ref={(element) => { pathsRef.current[index] = element; }} />)}
    </defs>
    <g>
      <animateMotion ref={animationRef} begin="indefinite" dur={`${motion.durationMs}ms`}
        fill="freeze" repeatCount="1" path={motion.path} rotate="0" calcMode="spline"
        keyTimes={motion.keyTimes} keySplines={motion.keySplines} />
      <image href={source} x="0" y="0" width={size} height={size} preserveAspectRatio="xMidYMid meet" />
      {children}
    </g>
  </g>;
}
