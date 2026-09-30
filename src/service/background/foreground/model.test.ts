import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SWAMP_BACKGROUND } from '../../../configs/backgrounds/swampConfig';
import type { BackgroundScene } from '../../../types/background';
import { FOREGROUND_MOTION as config } from '../../../configs/backgrounds/foregroundMotionConfig';
import { VIEWPORT_PRESENTATION as viewport } from '../../../configs/viewportConfig';
import { createForegroundModel } from './model';
import { createForegroundMeshes, createMeshIndices, updateMesh } from './mesh';

const scene: BackgroundScene = SWAMP_BACKGROUND;

test('all clumps react immediately with distinct responses and can reset during a combo', () => {
  const model = createForegroundModel(scene);
  assert.equal(model.active, false);
  model.impulse(1);
  assert.equal(model.active, true);
  model.advance(config.stepSeconds);
  assert(model.ground.position > 0);
  assert(model.stones[0].position < model.ground.position);
  assert(model.bends.every(bend => bend !== 0));
  assert(new Set(model.bends).size > 1);
  const pose = model.bends.slice(), ground = model.ground.position;
  model.impulse(config.heavyGain);
  assert.deepEqual(model.bends, pose);
  assert.equal(model.ground.position, ground);
  model.reset();
  assert.equal(model.active, false);
  assert(model.bends.every(bend => bend === 0));
  assert.equal(model.ground.position, 0);
  assert(model.stones.every(stone => stone.position === 0 && stone.velocity === 0));
});

test('complete foreground settles after repeated same-frame hits', () => {
  const model = createForegroundModel(scene);
  for (let hit = 0; hit < 100; hit++) model.impulse(config.heavyGain);
  for (let step = 0; step < 10 / config.stepSeconds; step++) model.advance(config.stepSeconds);
  assert.equal(model.active, false);
  assert(model.bends.every(bend => bend === 0));
});

test('mesh rest positions and pinned grass edges preserve existing scene coordinates', () => {
  const meshes = createForegroundMeshes(scene);
  const scale = viewport.referenceWidth / scene.sourceWidth;
  const sprites = [...scene.hanging, ...[...scene.grass].sort((a, b) => b.id - a.id).flatMap(group => group.leaves)];
  assert.deepEqual(meshes.map(mesh => mesh.file), sprites.map(sprite => sprite.file));
  for (const [index, mesh] of meshes.entries()) {
    updateMesh(mesh, 0);
    assert(Math.abs(mesh.positions[0] - mesh.x) < 0.001);
    assert(Math.abs(mesh.positions[1] - mesh.y) < 0.001);
    const last = mesh.positions.length - 2;
    assert(Math.abs(mesh.positions[last] - (mesh.x + sprites[index].width * scale)) < 0.001);
    updateMesh(mesh, config.ground.maxDisplacement);
    assert(mesh.positions.every(Number.isFinite));
    if (!mesh.hanging) {
      for (let column = 0; column <= config.mesh.columns; column++) {
        const i = (config.mesh.rows * (config.mesh.columns + 1) + column) * 2;
        assert(Math.abs(mesh.positions[i] - (mesh.rest[i] + mesh.x)) < 0.001);
        assert(Math.abs(mesh.positions[i + 1] - (viewport.referenceHeight - scene.baselineBottom)) < 0.001);
      }
    }
  }
  const indices = createMeshIndices();
  assert(indices.every(index => index < meshes[0].positions.length / 2));
});

test('leaves in the same clump use one spring and a continuous shared field', () => {
  const meshes = createForegroundMeshes(scene).filter(mesh => !mesh.hanging);
  const groups = [...scene.grass].sort((a, b) => b.id - a.id);
  let offset = 0;
  for (const group of groups) {
    const members = meshes.slice(offset, offset + group.leaves.length);
    assert.equal(new Set(members.map(mesh => mesh.body)).size, 1);
    offset += group.leaves.length;
  }
});
