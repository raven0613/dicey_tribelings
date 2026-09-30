import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FOREGROUND_MOTION as config, GRASS_SPRING } from '../../../configs/backgrounds/foregroundMotionConfig';
import { SWAMP_GRASS_MOTION, SWAMP_HANGING_MOTION } from '../../../configs/backgrounds/swampMotionConfig';
import { addImpulse, advanceSpring, advanceStone, isMoving } from './physics';
import { grassWeight, deformHanging } from './deformation';
import { getForegroundImpact } from './impact';

test('a new impact preserves the current pose and adds velocity immediately', () => {
  const body = { position: 0, velocity: 0 };
  addImpulse(body, GRASS_SPRING, 1);
  advanceSpring(body, GRASS_SPRING, config.stepSeconds);
  const before = { ...body };
  addImpulse(body, GRASS_SPRING, 0.1);
  assert.equal(body.position, before.position);
  assert(body.velocity > before.velocity);
});

test('rapid hits stay within the energy envelope and settle exactly at rest', () => {
  const body = { position: 0, velocity: 0 };
  for (let hit = 0; hit < 100; hit++) {
    addImpulse(body, GRASS_SPRING, config.heavyGain);
    advanceSpring(body, GRASS_SPRING, config.stepSeconds);
    assert(Math.abs(body.position) <= GRASS_SPRING.maxDisplacement);
  }
  for (let step = 0; step < 10 / config.stepSeconds; step++) advanceSpring(body, GRASS_SPRING, config.stepSeconds);
  assert.deepEqual(body, { position: 0, velocity: 0 });
  assert.equal(isMoving(body), false);
});

test('spring motion is independent of frame partition before resting', () => {
  const a = { position: 0, velocity: GRASS_SPRING.impulse }, b = { ...a };
  advanceSpring(a, GRASS_SPRING, config.stepSeconds * 2);
  advanceSpring(b, GRASS_SPRING, config.stepSeconds);
  advanceSpring(b, GRASS_SPRING, config.stepSeconds);
  assert(Math.abs(a.position - b.position) < 1e-10);
  assert(Math.abs(a.velocity - b.velocity) < 1e-10);
});

test('stone separates naturally, stays above the moving ground, and returns to its origin', () => {
  const ground = { position: 0, velocity: 0 }, stone = { position: 0, velocity: 0 };
  addImpulse(ground, config.ground, 1);
  let separated = false;
  for (let step = 0; step < 4 / config.stepSeconds; step++) {
    if (step === 12) addImpulse(ground, config.ground, 1);
    advanceSpring(ground, config.ground, config.stepSeconds);
    advanceStone(stone, ground, config.stepSeconds);
    const gap = ground.position - stone.position;
    separated ||= gap > config.restPosition;
    assert(gap >= -1e-10 && gap <= config.stone.maxGap + 1e-10);
  }
  assert(separated);
  assert.deepEqual(stone, { position: 0, velocity: 0 });
});

test('grass roots stay fixed while the upper and sideways regions bend continuously', () => {
  const motion = SWAMP_GRASS_MOTION[1], height = motion.rootRadius * 4;
  for (const x of [0, motion.rootX, motion.rootX * 2]) assert.equal(grassWeight(x, 0, height, motion), 0);
  const middle = grassWeight(motion.rootX, height / 2, height, motion);
  const tip = grassWeight(motion.rootX, height, height, motion);
  assert(tip > middle && middle > 0);
  assert.notEqual(middle, tip / 2);
  assert(grassWeight(motion.rootX + height, height / 3, height, motion) > grassWeight(motion.rootX, height / 3, height, motion));
});

test('hanging material fixes its configured attachment and bends below it', () => {
  const motion = SWAMP_HANGING_MOTION.vine1, reach = motion.pivotX * 2;
  const point = new Float32Array(2);
  deformHanging(point, 0, motion.pivotX, 0, motion.pivotX, reach, motion.spring.maxDisplacement, motion.swing);
  assert.equal(point[0], motion.pivotX);
  assert.equal(point[1], 0);
  deformHanging(point, 0, motion.pivotX, reach, motion.pivotX, reach, motion.spring.maxDisplacement, motion.swing);
  assert.notEqual(point[0], motion.pivotX);
});

test('each enemy impact fires once including shields; recoil and other hits do not fire', () => {
  const impact = { kind: 'enemy' as const };
  const attack = { stage: 'impact' as const, heavy: false, healthDamage: 0, shieldDamage: 1 };
  assert.equal(getForegroundImpact(impact, null, attack), 1);
  assert.equal(getForegroundImpact(impact, impact, attack), 0);
  assert.equal(getForegroundImpact({ ...impact }, impact, attack), 1);
  assert.equal(getForegroundImpact(impact, null, { ...attack, heavy: true }), config.heavyGain);
  assert.equal(getForegroundImpact(impact, null, { ...attack, stage: 'recoil' }), 0);
  assert.equal(getForegroundImpact(impact, null, { ...attack, shieldDamage: 0 }), 0);
  assert.equal(getForegroundImpact({ kind: 'player' }, null, attack), 0);
  assert.equal(getForegroundImpact(null, impact, null), 0);
});
