import { DICE_CHARACTER_PRESENTATION } from '../../configs/dicePresentationConfig';
import type { CreatureId } from '../../types/creatures';

interface Point { x: number; y: number }

interface CurveEntrancePath {
  movingLayer: number;
  start: Point;
  control: Point;
}

interface CurveEntranceConfig extends CurveEntrancePath {
  durationMs: number;
  easing: string;
}

interface EntranceSegment {
  path: string;
  durationMs: number;
  easing: string;
}

export interface CharacterEntranceMotion {
  movingLayer: number;
  parentLayer?: number;
  start: Point;
  path: string;
  distancePaths: string[];
  durationMs: number;
  keyTimes: string;
  keySplines: string;
}

const moveTo = (point: Point) => `M${point.x} ${point.y}`;
const curveTo = (control: Point, end: Point) => `Q${control.x} ${control.y} ${end.x} ${end.y}`;

/** Each segment keeps its own elapsed time; SVG measures the cumulative path distances. */
function createEntranceMotion(movingLayer: number, start: Point, segments: EntranceSegment[]): CharacterEntranceMotion {
  const activeSegments = segments.filter((segment) => segment.durationMs > 0);
  const durationMs = activeSegments.reduce((sum, segment) => sum + segment.durationMs, 0);
  let elapsedMs = 0;
  return {
    movingLayer, start, durationMs,
    path: segments[segments.length - 1].path,
    distancePaths: [moveTo(start), ...activeSegments.map((segment) => segment.path)],
    keyTimes: [0, ...activeSegments.map((segment) => {
      elapsedMs += segment.durationMs;
      return elapsedMs / durationMs;
    })].join(';'),
    keySplines: activeSegments.map((segment) => segment.easing).join(';'),
  };
}

/** Split an upward-arching quadratic at its minimum y, preserving the exact curve. */
function getCharacterEntrancePaths(start: Point, control: Point, press: Point) {
  const peakTime = (start.y - control.y) / (start.y - 2 * control.y + press.y);
  const interpolate = (from: Point, to: Point): Point => ({
    x: from.x + (to.x - from.x) * peakTime,
    y: from.y + (to.y - from.y) * peakTime,
  });
  const riseControl = interpolate(start, control);
  const pressControl = interpolate(control, press);
  const peak = interpolate(riseControl, pressControl);
  const rise = `${moveTo(start)} ${curveTo(riseControl, peak)}`;
  const descent = curveTo(pressControl, press);
  return {
    rise,
    curve: `${rise} ${descent}`,
    complete: `${rise} ${descent} L0 0`,
  };
}

function createGangMotion() {
  const art = DICE_CHARACTER_PRESENTATION.gang;
  const paths = getCharacterEntrancePaths(art.start, art.control, art.press);
  const travelMs = art.durationMs - art.pressHoldMs - art.reboundMs;
  const riseMs = travelMs * art.riseFraction;
  return createEntranceMotion(art.movingLayer, art.start, [
    { path: paths.rise, durationMs: riseMs, easing: art.riseEasing },
    { path: paths.curve, durationMs: travelMs - riseMs, easing: art.pressEasing },
    { path: paths.curve, durationMs: art.pressHoldMs, easing: '0 0 1 1' },
    { path: paths.complete, durationMs: art.reboundMs, easing: art.reboundEasing },
  ]);
}

function createCurveMotion(art: CurveEntranceConfig, delayMs: number) {
  return createEntranceMotion(art.movingLayer, art.start, [
    { path: moveTo(art.start), durationMs: delayMs, easing: '0 0 1 1' },
    { path: `${moveTo(art.start)} ${curveTo(art.control, { x: 0, y: 0 })}`,
      durationMs: art.durationMs, easing: art.easing },
  ]);
}

function createSisterMotions(art: {
  head: { durationMs: number; easing: string };
  face: CurveEntrancePath;
  eyes: CurveEntrancePath;
  hand: CurveEntranceConfig & { startDelayMs: number };
}, delayMs: number) {
  const { head, face, eyes, hand } = art;
  return [
    createCurveMotion({ ...face, ...head }, delayMs),
    // Nest the eye motion under the face so its whole curve stays relative to the moving face.
    { ...createCurveMotion({ ...eyes, ...head }, delayMs), parentLayer: face.movingLayer },
    createCurveMotion(hand, delayMs + hand.startDelayMs),
  ];
}

const sisters = DICE_CHARACTER_PRESENTATION.sisters;
const entranceMotions: Partial<Record<CreatureId, readonly CharacterEntranceMotion[]>> = {
  gang: [createGangMotion()],
  sisters: [
    ...createSisterMotions(sisters.red, 0),
    ...createSisterMotions(sisters.blue, sisters.staggerMs),
  ],
};

export function getCharacterEntranceMotions(creature: CreatureId) {
  return entranceMotions[creature];
}
