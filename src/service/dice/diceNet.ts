import type { Dice } from '../../types/game';
import { getDiceGeometry, type DiceGeometryFace } from './diceGeometry';

type Point = [number, number];
type Hinge = [number, number];
export interface NetBounds { x: number; y: number; width: number; height: number }
export interface DiceNetFace {
  rotation: number;
  points: Point[];
  bounds: NetBounds;
  contentBounds: NetBounds;
}

// Ordered parent/child hinges form a non-overlapping net for each supported solid.
const NET_HINGES: Record<Dice['dieType'], Hinge[]> = {
  d4: [[0, 1], [0, 2], [0, 3]],
  d6: [[0, 2], [0, 3], [0, 4], [0, 5], [5, 1]],
  d8: [[0, 4], [4, 5], [5, 1], [5, 7], [4, 6], [1, 3], [3, 2]],
  d10: [[0, 8], [0, 2], [8, 6], [0, 9], [2, 4], [9, 7], [0, 1], [1, 3], [7, 5]],
  d12: [[0, 6], [0, 5], [0, 2], [5, 7], [2, 1], [5, 11], [5, 10], [1, 8], [2, 4], [11, 9], [9, 3]],
};

function getBounds(points: Point[]): NetBounds {
  const x = Math.min(...points.map((point) => point[0]));
  const y = Math.min(...points.map((point) => point[1]));
  return { x, y, width: Math.max(...points.map((point) => point[0])) - x,
    height: Math.max(...points.map((point) => point[1])) - y };
}

function worldVertices(face: DiceGeometryFace) {
  return face.points.map(([x, y]) => face.center.map((value, axis) =>
    value + face.right[axis] * x + face.up[axis] * y));
}

/** An upright text rectangle inside every edge, with breathing room at the boundary. */
function getContentBounds(points: Point[]): NetBounds {
  const center = points.reduce<Point>((sum, point) =>
    [sum[0] + point[0] / points.length, sum[1] + point[1] / points.length], [0, 0]);
  const aspect = 1;
  const halfHeight = Math.min(...points.map((a, index) => {
    const b = points[(index + 1) % points.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const distance = Math.abs(dx * (center[1] - a[1]) - dy * (center[0] - a[0]));
    return distance / (Math.abs(dx) + Math.abs(dy) * aspect);
  })) * 0.94;
  return { x: center[0] - halfHeight * aspect, y: center[1] - halfHeight,
    width: halfHeight * aspect * 2, height: halfHeight * 2 };
}

function buildDiceNet(type: Dice['dieType']) {
  const geometry = getDiceGeometry(type);
  const vertices = geometry.map(worldVertices);
  const polygons: Point[][] = Array.from({ length: geometry.length });
  polygons[0] = geometry[0].points;
  const folds: [Point, Point][] = [];

  for (const [parent, child] of NET_HINGES[type]) {
    const shared = vertices[parent].flatMap((vertex, parentIndex) =>
      vertices[child].flatMap((other, childIndex) =>
        Math.hypot(...vertex.map((value, axis) => value - other[axis])) < 1e-6
          ? [{ parentIndex, childIndex }] : []));
    const [first, second] = shared;
    const a = geometry[child].points[first.childIndex];
    const b = geometry[child].points[second.childIndex];
    const p = polygons[parent][first.parentIndex];
    const q = polygons[parent][second.parentIndex];
    const angle = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    polygons[child] = geometry[child].points.map(([x, y]): Point => [
      p[0] + cosine * (x - a[0]) - sine * (y - a[1]),
      p[1] + sine * (x - a[0]) + cosine * (y - a[1]),
    ]);
    folds.push([p, q]);
  }

  const orient = ([x, y]: Point): Point => type === 'd6' ? [y, -x] : [x, y];
  const bounds = getBounds(polygons.flat().map(orient));
  const translate = (point: Point): Point => {
    const [x, y] = orient(point);
    return [x - bounds.x, y - bounds.y];
  };
  const faces: DiceNetFace[] = polygons.map((polygon, index) => {
    const points = polygon.map(translate);
    const local = geometry[index].points;
    const angle = (a: Point, b: Point) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    const rotation = (angle(points[0], points[1]) - angle(local[0], local[1])) * 180 / Math.PI;
    return { rotation, points, bounds: getBounds(points), contentBounds: getContentBounds(points) };
  });
  return { faces, width: bounds.width, height: bounds.height,
    folds: folds.map(([a, b]) => [translate(a), translate(b)] as [Point, Point]) };
}

const nets = {
  d4: buildDiceNet('d4'), d6: buildDiceNet('d6'), d8: buildDiceNet('d8'),
  d10: buildDiceNet('d10'), d12: buildDiceNet('d12'),
};

/** A fixed orientation keeps directional stickers consistent across viewports. */
export const getDiceNet = (type: Dice['dieType']) => nets[type];
