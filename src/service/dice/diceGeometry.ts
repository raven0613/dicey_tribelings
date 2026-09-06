import type { Dice } from '../../types/game';

type Vector = [number, number, number];
export interface DiceGeometryFace {
  normal: Vector;
  right: Vector;
  up: Vector;
  center: Vector;
  points: [number, number][];
  neighbors: number[];
}

const dot = (a: Vector, b: Vector) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const scale = (v: Vector, amount: number): Vector => v.map((value) => value * amount) as Vector;
const cross = (a: Vector, b: Vector): Vector => [
  a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0],
];
const normalize = (v: Vector) => scale(v, 1 / Math.hypot(...v));
const EPSILON = 1e-7;

function faceNormals(type: Dice['dieType']): Vector[] {
  switch (type) {
    case 'd4': return [[1, 1, 1], [-1, -1, 1], [-1, 1, -1], [1, -1, -1]];
    // Face order matches the original cube: front, back, right, left, top, bottom.
    case 'd6': return [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, -1, 0], [0, 1, 0]];
    case 'd8': return [-1, 1].flatMap((x) => [-1, 1].flatMap((y) => [-1, 1].map((z): Vector => [x, y, z])));
    case 'd10': return Array.from({ length: 10 }, (_, index): Vector => {
      const angle = index * Math.PI / 5;
      return [Math.cos(angle), index % 2 === 0 ? 0.5 : -0.5, Math.sin(angle)];
    });
    case 'd12': {
      const phi = (1 + Math.sqrt(5)) / 2;
      return [-1, 1].flatMap((a) => [-1, 1].flatMap((b): Vector[] =>
        [[0, a, b * phi], [a, b * phi, 0], [b * phi, 0, a]]));
    }
  }
}

/** Intersect the face planes of each convex die to share topology with rendering. */
function buildGeometry(type: Dice['dieType']): DiceGeometryFace[] {
  const normals = faceNormals(type).map(normalize);
  const vertices: Vector[] = [];
  for (let a = 0; a < normals.length; a++) {
    for (let b = a + 1; b < normals.length; b++) {
      for (let c = b + 1; c < normals.length; c++) {
        const bc = cross(normals[b], normals[c]);
        const determinant = dot(normals[a], bc);
        if (Math.abs(determinant) < EPSILON) continue;
        const ca = cross(normals[c], normals[a]);
        const ab = cross(normals[a], normals[b]);
        const point = bc.map((value, i) => (value + ca[i] + ab[i]) / determinant) as Vector;
        if (normals.some((normal) => dot(normal, point) > 1 + EPSILON)) continue;
        if (vertices.some((v) => Math.hypot(...v.map((value, i) => value - point[i])) < EPSILON)) continue;
        vertices.push(point);
      }
    }
  }
  const radius = Math.max(...vertices.flatMap((point) => point.map(Math.abs)));
  const faceVertices = normals.map((normal) => vertices.flatMap((vertex, index) =>
    Math.abs(dot(normal, vertex) - 1) < EPSILON ? [index] : []));
  return normals.map((normal, index) => {
    const right = normalize(cross(Math.abs(normal[1]) > 0.99 ? [0, 0, -1] : [0, 1, 0], normal));
    const up = cross(normal, right);
    const points = faceVertices[index].map((vertex): [number, number] =>
      [dot(vertices[vertex], right) / radius, dot(vertices[vertex], up) / radius]);
    points.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]));
    const neighbors = faceVertices.flatMap((other, otherIndex) =>
      otherIndex !== index && other.filter((vertex) => faceVertices[index].includes(vertex)).length === 2
        ? [otherIndex] : []);
    return { normal, right, up, center: scale(normal, 1 / radius), points, neighbors };
  });
}

const geometry: Record<Dice['dieType'], DiceGeometryFace[]> = {
  d4: buildGeometry('d4'), d6: buildGeometry('d6'), d8: buildGeometry('d8'),
  d10: buildGeometry('d10'), d12: buildGeometry('d12'),
};

export const getDiceGeometry = (type: Dice['dieType']) => geometry[type];
