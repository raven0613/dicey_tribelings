import type { CharacterFrameSequence } from '../../configs/dicePresentationConfig';

/** Frames and swing share one loop, retaining the full elapsed time of each movement. */
export function getCharacterSequenceTimeline(sequence: CharacterFrameSequence) {
  const { swing, frames } = sequence;
  const swingDurationMs = swing ? swing.outDurationMs + swing.returnDurationMs : 0;
  const cycleDurationMs = Math.max(sequence.durationMs, swingDurationMs);
  const frameKeyTimes = [
    ...frames.map((_, index) => index * sequence.durationMs / frames.length / cycleDurationMs), 1,
  ].join(';');

  let rotation: { values: string; keyTimes: string; keySplines: string } | undefined;
  if (swing) {
    const rotate = (angle: number) => `${angle} ${swing.pivot.x} ${swing.pivot.y}`;
    const values = [rotate(0), rotate(swing.angleDeg), rotate(0)];
    const times = [0, swing.outDurationMs / cycleDurationMs, swingDurationMs / cycleDurationMs];
    const splines = [swing.outEasing, swing.returnEasing];
    if (swingDurationMs < cycleDurationMs) {
      values.push(rotate(0));
      times.push(1);
      splines.push('0 0 1 1');
    }
    rotation = { values: values.join(';'), keyTimes: times.join(';'), keySplines: splines.join(';') };
  }

  return { cycleDurationMs, frameKeyTimes, rotation };
}
