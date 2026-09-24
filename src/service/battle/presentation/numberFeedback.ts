import { BATTLE_PRESENTATION } from '../../../configs/battleConfig';
import { DICE_NUMBER_FEEDBACK as dice, DAMAGE_POP_PRESENTATION as pop } from '../../../configs/numberFeedbackConfig';
import { DICE_NUMBER_PRESENTATION as paint } from '../../../configs/dicePresentationConfig';
import type { NumberDisplay, SkillChange } from '../../../types/battle';
import { ceilDamage } from '../damageValue';

const strength = (value: number, reference: number) => Math.max(0, value) / (Math.max(0, value) + reference);
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;

export function getDiceFontSize(value: number): number {
  return lerp(dice.font.min, dice.font.max, strength(value, dice.font.reference));
}

export function getDamagePopAppearance(value: number) {
  const amount = strength(value, pop.font.reference);
  return { fontSize: lerp(pop.font.min, pop.font.max, amount), peak: lerp(pop.peak.min, pop.peak.max, amount), launch: lerp(pop.launch.min, pop.launch.max, amount) };
}

/** Preserve vertical size at digit boundaries; fit wide numbers horizontally into the face. */
export function getDiceNumberLayout(value: number | '?', animatedSize: number | undefined, minimumFontSize: number) {
  const fontSize = value === '?' ? Math.max(paint.fontSize, minimumFontSize)
    : (animatedSize ?? getDiceFontSize(value)) * Math.max(1, minimumFontSize / dice.font.min);
  const naturalWidth = String(value).length * fontSize * dice.glyphWidth;
  return { fontSize, width: Math.min(paint.maxWidth, naturalWidth), fitted: naturalWidth > paint.maxWidth };
}

export const getNumberDuration = (change: SkillChange) => change.kind === 'attack' || change.kind === 'bonus'
  ? dice.timing.rollMs + dice.timing.popMs + dice.timing.settleMs : BATTLE_PRESENTATION.numberDurationMs;

/** Each target owns its current value and size; a new skill only replaces that target. */
export function tweenNumber(change: SkillChange, from: NumberDisplay, progress: number): NumberDisplay {
  const p = Math.max(0, Math.min(1, progress));
  const attack = change.kind === 'attack' || change.kind === 'bonus';
  const target = attack ? ceilDamage(change.after) : change.after;
  const increasing = change.after > change.before && target > from.displayValue;
  const duration = getNumberDuration(change);
  const arrival = attack && increasing ? dice.timing.rollMs / duration : 1;
  const t = Math.min(1, p / arrival);
  const numberProgress = attack ? t * t * (3 - 2 * t) : easeOut(t);
  const displayValue = p >= arrival ? target
    : Math.round(lerp(Math.floor(from.displayValue), Math.floor(target), numberProgress));
  if (attack) {
    const startSize = from.fontSize ?? getDiceFontSize(from.displayValue);
    const resultSize = getDiceFontSize(target);
    const peak = resultSize * lerp(dice.peak.min, dice.peak.max, strength(target, dice.font.reference));
    const peakTime = (dice.timing.rollMs + dice.timing.popMs) / duration;
    const fontSize = !increasing ? lerp(startSize, resultSize, easeOut(p))
      : p <= arrival ? lerp(startSize, resultSize, numberProgress)
      : p <= peakTime ? lerp(resultSize, peak, easeOut((p - arrival) / (peakTime - arrival)))
      : lerp(peak, resultSize, easeOut((p - peakTime) / (1 - peakTime)));
    return { displayValue, fontSize, scale: 1, isSpinning: p < arrival, isLocked: p >= arrival, isBuffed: change.after > change.before };
  }
  const pulse = dice.resourcePulse;
  const peak = Math.abs(change.after - change.before) >= pulse.threshold ? pulse.large : pulse.small;
  const scale = p < pulse.peakFraction ? lerp(from.scale, peak, p / pulse.peakFraction)
    : lerp(peak, 1, 1 - (1 - (p - pulse.peakFraction) / (1 - pulse.peakFraction)) ** 2);
  return { displayValue, scale: p === 1 ? 1 : scale, isSpinning: p < 1, isLocked: p === 1, isBuffed: change.after > change.before };
}
