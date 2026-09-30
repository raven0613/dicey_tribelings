import type { BackgroundScene, BackgroundImageAsset } from '../../../types/background';
import { VIEWPORT_PRESENTATION } from '../../../configs/viewportConfig';
import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import { grassWeight, deformHanging } from './deformation';

export interface ForegroundMesh {
  file: string;
  body: number;
  x: number;
  y: number;
  height: number;
  rest: Float32Array;
  positions: Float32Array;
  uv: Float32Array;
  weights: Float32Array;
  direction: readonly [number, number];
  hanging?: { pivotX: number; swing: number };
}

export function createMeshIndices() {
  const { columns, rows } = config.mesh;
  const indices = new Uint16Array(columns * rows * 6);
  let i = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    const a = y * (columns + 1) + x, b = a + columns + 1;
    indices.set([a, b, a + 1, a + 1, b, b + 1], i); i += 6;
  }
  return indices;
}

export function createForegroundMeshes(scene: BackgroundScene): ForegroundMesh[] {
  const scale = VIEWPORT_PRESENTATION.referenceWidth / scene.sourceWidth;
  const { columns, rows } = config.mesh;
  const create = (asset: BackgroundImageAsset, body: number, x: number, y: number): ForegroundMesh => {
    const count = (columns + 1) * (rows + 1);
    const rest = new Float32Array(count * 2), uv = new Float32Array(count * 2);
    for (let row = 0; row <= rows; row++) for (let column = 0; column <= columns; column++) {
      const i = (row * (columns + 1) + column) * 2;
      uv[i] = column / columns; uv[i + 1] = row / rows;
      rest[i] = asset.width * scale * uv[i]; rest[i + 1] = asset.height * scale * uv[i + 1];
    }
    return { file: asset.file, body, x, y, height: asset.height * scale,
      rest, uv, positions: new Float32Array(count * 2), weights: new Float32Array(count), direction: [1, 0] };
  };
  const meshes: ForegroundMesh[] = [];
  scene.hanging.forEach((asset, body) => {
    const mesh = create(asset, body, asset.x, scene.baselineTop);
    mesh.hanging = { pivotX: asset.motion.pivotX * scale, swing: asset.motion.swing };
    meshes.push(mesh);
  });
  [...scene.grass].sort((a, b) => b.id - a.id).forEach((group, index) => {
    const height = Math.max(...group.leaves.map(leaf => leaf.height)) * scale;
    for (const leaf of group.leaves) {
      const mesh = create(leaf, scene.hanging.length + index, group.x + leaf.localX,
        VIEWPORT_PRESENTATION.referenceHeight - scene.baselineBottom - leaf.height * scale);
      mesh.direction = group.motion.direction;
      for (let i = 0; i < mesh.weights.length; i++) mesh.weights[i] = grassWeight(
        leaf.localX + mesh.rest[i * 2], mesh.height - mesh.rest[i * 2 + 1], height, group.motion);
      meshes.push(mesh);
    }
  });
  return meshes;
}

export function updateMesh(mesh: ForegroundMesh, bend: number) {
  for (let i = 0; i < mesh.rest.length; i += 2) {
    const x = mesh.rest[i], y = mesh.rest[i + 1];
    if (mesh.hanging) deformHanging(mesh.positions, i, x, y, mesh.hanging.pivotX, mesh.height, bend, mesh.hanging.swing);
    else {
      const displacement = bend * mesh.weights[i / 2];
      mesh.positions[i] = x + displacement * mesh.direction[0];
      mesh.positions[i + 1] = y + displacement * mesh.direction[1];
    }
    mesh.positions[i] += mesh.x; mesh.positions[i + 1] += mesh.y;
  }
}
