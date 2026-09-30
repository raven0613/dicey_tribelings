import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import type { MotionBody, SpringConfig } from '../../../types/foregroundMotion';

export function isMoving(body: MotionBody) {
  return body.position !== 0 || body.velocity !== 0;
}

/** Bound total spring energy without changing the pose on impact. */
export function addImpulse(body: MotionBody, spring: SpringConfig, gain: number) {
  const omega = 2 * Math.PI * spring.frequency;
  const speedLimit = omega * Math.sqrt(Math.max(0, spring.maxDisplacement ** 2 - body.position ** 2));
  body.velocity = Math.max(-speedLimit, Math.min(speedLimit, body.velocity + spring.impulse * gain));
}

/** Exact underdamped oscillator solution; time is seconds, position is design units. */
export function advanceSpring(body: MotionBody, spring: SpringConfig, seconds: number) {
  if (!isMoving(body)) return;
  const omega = 2 * Math.PI * spring.frequency;
  const decay = omega * spring.dampingRatio;
  const frequency = omega * Math.sqrt(1 - spring.dampingRatio ** 2);
  const a = body.position, b = (body.velocity + decay * a) / frequency;
  const sin = Math.sin(frequency * seconds), cos = Math.cos(frequency * seconds);
  const envelope = Math.exp(-decay * seconds);
  body.position = envelope * (a * cos + b * sin);
  body.velocity = envelope * ((b * frequency - decay * a) * cos - (a * frequency + decay * b) * sin);
  if (Math.abs(body.position) < config.restPosition && Math.abs(body.velocity) < config.restVelocity) {
    body.position = 0;
    body.velocity = 0;
  }
}

export function advanceStone(stone: MotionBody, ground: MotionBody, seconds: number) {
  stone.position += stone.velocity * seconds + config.stone.gravity * seconds ** 2 / 2;
  stone.velocity += config.stone.gravity * seconds;
  if (stone.position >= ground.position) {
    const relativeSpeed = stone.velocity - ground.velocity;
    stone.position = ground.position;
    stone.velocity = relativeSpeed > config.stone.landingSpeed
      ? ground.velocity - relativeSpeed * config.stone.restitution : ground.velocity;
  }
  if (ground.position - stone.position > config.stone.maxGap) {
    stone.position = ground.position - config.stone.maxGap;
    stone.velocity = Math.max(stone.velocity, ground.velocity);
  }
  if (!isMoving(ground) && Math.abs(stone.position) < config.restPosition
    && Math.abs(stone.velocity) < config.stone.landingSpeed) {
    stone.position = 0;
    stone.velocity = 0;
  }
}
