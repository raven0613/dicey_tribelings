import { DICE_TRAY_PRESENTATION, PHANTOM_DICE_PRESENTATION as config } from '../../configs/dicePresentationConfig';

/** Bounds of the visible rounded faces after rotateY then rotateX, matching CSS. */
export function getPhantomProjection(size: number = DICE_TRAY_PRESENTATION.size) {
  const x = config.rotateX * Math.PI / 180;
  const y = config.rotateY * Math.PI / 180;
  const rotation = [
    [Math.cos(y), 0, Math.sin(y)],
    [Math.sin(x) * Math.sin(y), Math.cos(x), -Math.sin(x) * Math.cos(y)],
    [-Math.cos(x) * Math.sin(y), Math.sin(x), Math.cos(x) * Math.cos(y)],
  ];
  const half = config.side / 2;
  const radius = config.cornerRadius;
  const bounds = [0, 1].map((dimension) => {
    const edges: number[] = [];
    for (let normal = 0; normal < 3; normal++) {
      const axes = [0, 1, 2].filter((axis) => axis !== normal);
      const a = rotation[dimension][axes[0]], b = rotation[dimension][axes[1]];
      // Support of a rounded rectangle: inset square plus a radius-sized circle.
      const extent = (half - radius) * (Math.abs(a) + Math.abs(b)) + radius * Math.hypot(a, b);
      for (const sign of [-1, 1]) {
        if (sign * rotation[2][normal] <= 0) continue;
        const center = sign * half * rotation[dimension][normal];
        edges.push(center - extent, center + extent);
      }
    }
    return { min: Math.min(...edges), max: Math.max(...edges) };
  });
  return {
    scaleX: size / (bounds[0].max - bounds[0].min),
    scaleY: size / (bounds[1].max - bounds[1].min),
    offsetX: -(bounds[0].max + bounds[0].min) / 2,
    offsetY: -(bounds[1].max + bounds[1].min) / 2,
  };
}
