import assert from 'node:assert/strict';
import test from 'node:test';
import { DICE_TRAY_PRESENTATION as layout, DICE_NUMBER_PRESENTATION as number,
  PHANTOM_DICE_PRESENTATION as phantom } from '../../configs/dicePresentationConfig';
import { ALL_FACE_TAGS } from '../../configs/materials/materialConfig';
import { configuredDice } from './diceFactory';
import { getDiceTrayLayout } from './diceTrayLayout';
import { getNumberPaint } from './diceNumberPaint';
import { getPhantomProjection } from './phantomProjection';

test('small viewports extend the tray while normal and reserved bonus bodies stay separated', () => {
  const dice = Array.from({ length: 7 }, (_, i) => configuredDice(`${i}`, '測試', 'd6', 'amber',
    Array.from({ length: 6 }, () => ['gang', 4])));
  dice[0].faces[0].material = 'echo';
  for (const size of [layout.size, layout.mobileSize]) for (const [width, height] of [[320, 140], [768, 300], [1440, 700]]) {
    const tray = getDiceTrayLayout(width, height, dice, layout.detailsHeight, size);
    assert.equal(tray.size, size);
    assert.ok(tray.width >= width);
    assert.ok(tray.height >= height);
    const positions = [...tray.positions, ...Object.values(tray.bonusPositions).flat()];
    for (const p of positions) {
      assert.ok(p.x >= size / 2 && p.x <= tray.width - size / 2);
      assert.ok(p.y >= size / 2 && p.y <= tray.height - size / 2);
      for (const other of positions) {
        if (other === p) continue;
        assert.ok(Math.abs(p.x - other.x) >= size || Math.abs(p.y - other.y) >= size);
      }
    }
    assert.deepEqual(tray.positions.map((p) => p.y), dice.map(() => tray.positions[0].y));
  }
});

test('tag order does not change the light-to-dark split; all tags select the rainbow palette', () => {
  const single = getNumberPaint(['warrior']);
  assert.deepEqual(single.colors, [number.tagColors.warrior]);
  const split = getNumberPaint(['warrior', 'common']);
  assert.deepEqual(split, getNumberPaint(['common', 'warrior']));
  assert.deepEqual(split.colors, [number.tagColors.warrior, number.tagColors.common]);
  assert.equal(split.hardSplit, true);
  const rainbow = getNumberPaint([...ALL_FACE_TAGS].reverse());
  assert.deepEqual(rainbow.colors, number.rainbowColors);
  assert.equal(rainbow.hardSplit, false);
});

test('visible rounded cube faces project to the same fixed footprint as normal dice', () => {
  for (const size of [layout.size, layout.mobileSize]) {
    const projection = getPhantomProjection(size);
    const rotate = ([x, y, z]: number[]) => {
      const ay = phantom.rotateY * Math.PI / 180, ax = phantom.rotateX * Math.PI / 180;
      const rotatedX = x * Math.cos(ay) + z * Math.sin(ay);
      const rotatedZ = z * Math.cos(ay) - x * Math.sin(ay);
      return [rotatedX, y * Math.cos(ax) - rotatedZ * Math.sin(ax), y * Math.sin(ax) + rotatedZ * Math.cos(ax)];
    };
    const points: number[][] = [];
    const half = phantom.side / 2, inset = half - phantom.cornerRadius;
    for (let normal = 0; normal < 3; normal++) for (const sign of [-1, 1]) {
      const direction = [0, 0, 0]; direction[normal] = sign;
      if (rotate(direction)[2] <= 0) continue;
      const axes = [0, 1, 2].filter((axis) => axis !== normal);
      // Sample every rounded corner independently of the bounds solver.
      for (let degree = 0; degree < 360; degree++) {
        const angle = degree * Math.PI / 180;
        const point = [0, 0, 0]; point[normal] = sign * half;
        point[axes[0]] = Math.sign(Math.cos(angle)) * inset + Math.cos(angle) * phantom.cornerRadius;
        point[axes[1]] = Math.sign(Math.sin(angle)) * inset + Math.sin(angle) * phantom.cornerRadius;
        const [x, y] = rotate(point);
        points.push([(x + projection.offsetX) * projection.scaleX, (y + projection.offsetY) * projection.scaleY]);
      }
    }
    for (const dimension of [0, 1]) {
      const values = points.map((point) => point[dimension]);
      assert.ok(Math.abs(Math.min(...values) + size / 2) < 0.01);
      assert.ok(Math.abs(Math.max(...values) - size / 2) < 0.01);
    }
  }
});
