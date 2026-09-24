import assert from 'node:assert/strict';
import test from 'node:test';
import { createNumberTimeline } from './numberTimeline';
import { getNumberDuration, tweenNumber } from './numberFeedback';
import { DICE_NUMBER_FEEDBACK as config } from '../../../configs/numberFeedbackConfig';
import type { NumberDisplay, SkillChange } from '../../../types/battle';
const still = (value: number): NumberDisplay => ({ displayValue: value, scale: 1, isLocked: true, isSpinning: false, isBuffed: false });

test('another die starts independently; only a new change to the same target replaces its tween', () => {
  const a: SkillChange = { kind: 'attack', targetId: 'a', before: 12, after: 120 };
  const b: SkillChange = { kind: 'attack', targetId: 'b', before: 2, after: 30 };
  const timeline = createNumberTimeline();
  const values = new Map<string, NumberDisplay>();
  const write = (change: SkillChange, value: NumberDisplay) => { values.set(change.targetId, value); };
  timeline.start(a, still(a.before), 0);
  const halfway = getNumberDuration(a) / 2;
  timeline.advance(halfway, write);
  timeline.start(b, still(b.before), halfway);
  timeline.advance(halfway, write);
  assert.deepEqual(values.get('a'), tweenNumber(a, still(a.before), .5));
  const next: SkillChange = { ...a, before: a.after, after: 300 };
  const current = values.get('a')!;
  timeline.start(next, current, halfway);
  timeline.advance(halfway, write);
  assert.equal(values.get('a')?.fontSize, current.fontSize);
  assert.equal(values.get('b')?.displayValue, b.before);
  timeline.advance(halfway + getNumberDuration(next), write);
  assert.equal(timeline.size, 0);
  assert.equal(values.get('a')?.displayValue, next.after);
  assert.equal(values.get('b')?.displayValue, b.after);
});

test('the value arrives before the distinct pop peak and settling phase', () => {
  const change: SkillChange = { kind: 'attack', targetId: 'a', before: 12, after: 120 };
  const duration = getNumberDuration(change);
  const arrived = tweenNumber(change, still(change.before), config.timing.rollMs / duration);
  const peak = tweenNumber(change, still(change.before), (config.timing.rollMs + config.timing.popMs) / duration);
  const settled = tweenNumber(change, still(change.before), 1);
  assert.equal(arrived.displayValue, change.after);
  assert.ok(peak.fontSize! > arrived.fontSize!);
  assert.equal(arrived.fontSize, settled.fontSize);
  const halfway = tweenNumber(change, still(change.before), config.timing.rollMs / 2 / duration);
  assert.equal(halfway.displayValue, (change.before + change.after) / 2);
});
