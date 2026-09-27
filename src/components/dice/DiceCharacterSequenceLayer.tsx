import { useImperativeHandle, useRef, type Ref } from 'react';
import { DICE_FACE_PRESENTATION, type CharacterFrameSequence } from '../../configs/dicePresentationConfig';
import type { CharacterEntranceHandle } from './characterEntranceHandle';
import { getCharacterSequenceTimeline } from '../../service/dice/characterSequenceTimeline';

interface DiceCharacterSequenceLayerProps {
  sequence: CharacterFrameSequence;
  ref: Ref<CharacterEntranceHandle>;
}

/** Frame switching and the optional root swing share the same finite SVG loop. */
export function DiceCharacterSequenceLayer({ sequence, ref }: DiceCharacterSequenceLayerProps) {
  const animationRefs = useRef(new Map<number, SVGAnimationElement>());
  useImperativeHandle(ref, () => ({
    start() {
      animationRefs.current.forEach((animation) => {
        animation.setAttribute('fill', 'freeze');
        animation.beginElement();
      });
    },
    stop() {
      animationRefs.current.forEach((animation) => {
        animation.setAttribute('fill', 'remove');
        animation.endElement();
      });
    },
  }), []);

  const size = DICE_FACE_PRESENTATION.viewBoxSize;
  const frameCount = sequence.frames.length;
  const { cycleDurationMs, frameKeyTimes, rotation } = getCharacterSequenceTimeline(sequence);
  const registerAnimation = (index: number, element: SVGAnimationElement | null) => {
    if (element) animationRefs.current.set(index, element);
    else animationRefs.current.delete(index);
  };
  return <g>
    {rotation && <animateTransform ref={(element: SVGAnimationElement | null) => registerAnimation(frameCount, element)}
      attributeName="transform" type="rotate" values={rotation.values}
      keyTimes={rotation.keyTimes} keySplines={rotation.keySplines} calcMode="spline"
      begin="indefinite" dur={`${cycleDurationMs}ms`} repeatCount={sequence.loopCount} fill="freeze" />}
    {sequence.frames.map((source, frameIndex) => {
      // The endpoint holds the last frame after the final iteration.
      const values = Array.from({ length: frameCount + 1 }, (_, index) =>
        Math.min(index, frameCount - 1) === frameIndex ? 1 : 0).join(';');
      return <image key={source} href={source} x="0" y="0" width={size} height={size}
        preserveAspectRatio="xMidYMid meet" opacity={frameIndex === 0 ? 1 : 0}>
        <animate ref={(element: SVGAnimationElement | null) => registerAnimation(frameIndex, element)}
          attributeName="opacity" values={values} keyTimes={frameKeyTimes}
          begin="indefinite" dur={`${cycleDurationMs}ms`} repeatCount={sequence.loopCount}
          calcMode="discrete" fill="freeze" />
      </image>;
    })}
  </g>;
}
