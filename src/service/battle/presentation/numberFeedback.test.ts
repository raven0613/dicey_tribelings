import assert from 'node:assert/strict';
import test from 'node:test';
import { DICE_NUMBER_FEEDBACK as config, DAMAGE_POP_PRESENTATION as popConfig } from '../../../configs/numberFeedbackConfig';
import { DICE_NUMBER_PRESENTATION as paint } from '../../../configs/dicePresentationConfig';
import { getDiceFontSize, getDamagePopAppearance, getDiceNumberLayout, getNumberDuration, tweenNumber } from './numberFeedback';
import type { NumberDisplay, SkillChange } from '../../../types/battle';

const still = (value: number): NumberDisplay => ({ displayValue: value, scale: 1, isSpinning: false, isLocked: true, isBuffed: false });
const change = (before: number, after: number, kind: SkillChange['kind'] = 'attack'): SkillChange => ({ kind, targetId: 'die', before, after });

test('result font and pulse strength grow with absolute value and remain bounded', () => {
  const values = [0, 2, 12, 30, 99, 100, 120, 1000, 1000000];
  for (let i = 1; i < values.length; i++) {
    assert.ok(getDiceFontSize(values[i]) > getDiceFontSize(values[i - 1]));
    const appearance = getDamagePopAppearance(values[i]);
    assert.ok(appearance.fontSize > getDamagePopAppearance(values[i - 1]).fontSize);
    assert.ok(appearance.peak > getDamagePopAppearance(values[i - 1]).peak);
    assert.ok(appearance.fontSize <= popConfig.font.max);
    assert.ok(getDiceFontSize(values[i]) <= config.font.max);
  }
  const small = tweenNumber(change(2, 30), still(2), (config.timing.rollMs + config.timing.popMs) / getNumberDuration(change(12, 120)));
  const large = tweenNumber(change(12, 120), still(12), (config.timing.rollMs + config.timing.popMs) / getNumberDuration(change(12, 120)));
  assert.equal(large.displayValue, 120);
  assert.ok(large.fontSize! > small.fontSize!);
  assert.ok(large.fontSize! / getDiceFontSize(120) > small.fontSize! / getDiceFontSize(30));
  assert.equal(tweenNumber(change(12, 120), still(12), 1).fontSize, getDiceFontSize(120));
  assert.equal(tweenNumber(change(119, 120), still(119), 1).fontSize, getDiceFontSize(120));
});

test('interrupted tweens preserve the visible size, reach the new value and shrink on decreases', () => {
  const first = tweenNumber(change(12, 120), still(12), config.timing.rollMs / getNumberDuration(change(12, 120)) / 2);
  const next = tweenNumber(change(120, 300), first, 0);
  assert.equal(next.displayValue, first.displayValue);
  assert.equal(next.fontSize, first.fontSize);
  const decrease = change(120, 2);
  let previousSize = first.fontSize!;
  for (let step = 0; step <= 10; step++) {
    const sample = tweenNumber(decrease, first, step / 10);
    assert.ok(sample.fontSize! <= previousSize);
    assert.ok(sample.displayValue >= 2 && sample.displayValue <= first.displayValue);
    previousSize = sample.fontSize!;
  }
  assert.equal(previousSize, getDiceFontSize(2));
});

test('digit count changes preserve font height and fit the full numeral into its width', () => {
  for (const minimum of [0, config.font.min * 2]) {
    const small = getDiceNumberLayout(30, undefined, minimum);
    const large = getDiceNumberLayout(120, undefined, minimum);
    assert.ok(large.fontSize > small.fontSize);
    for (const value of [99, 100, 120, 1000, 1000000]) {
      const layout = getDiceNumberLayout(value, undefined, minimum);
      assert.ok(layout.width <= paint.maxWidth);
      assert.ok(layout.fontSize >= minimum);
    }
    assert.ok(getDiceNumberLayout(100, undefined, minimum).fontSize > getDiceNumberLayout(99, undefined, minimum).fontSize);
  }
});

test('resources retain exact final precision while attacks round up', () => {
  assert.equal(tweenNumber(change(1, 2.1), still(1), 1).displayValue, 3);
  const food = change(1.5, 3.5, 'food');
  assert.equal(tweenNumber(food, still(1.5), 1).displayValue, 3.5);
  assert.equal(tweenNumber(food, still(1.5), 1).scale, 1);
  assert.equal(tweenNumber(food, still(1.5), 1).fontSize, undefined);
});
