import type { NumberDisplay, SkillChange } from '../../../types/battle';
import { getNumberDuration, tweenNumber } from './numberFeedback';

export function createNumberTimeline() {
  const active = new Map<string, { change: SkillChange; from: NumberDisplay; start: number }>();
  return {
    get size() { return active.size; },
    start(change: SkillChange, from: NumberDisplay, time: number) {
      active.set(`${change.kind}:${change.targetId}`, { change, from, start: time });
    },
    advance(time: number, write: (change: SkillChange, value: NumberDisplay) => void) {
      let settled = false;
      for (const [key, tween] of active) {
        const progress = Math.min(1, (time - tween.start) / getNumberDuration(tween.change));
        write(tween.change, tweenNumber(tween.change, tween.from, progress));
        if (progress === 1) { active.delete(key); settled = true; }
      }
      return settled;
    },
  };
}
