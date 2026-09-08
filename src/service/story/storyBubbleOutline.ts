import { STORY_PRESENTATION } from '../../configs/story/storyPresentationConfig';

interface OutlinePoint { x: number; y: number; nx: number; ny: number }
interface OutlineSegment { length: number; pointAt: (distance: number) => OutlinePoint }

function straight(x: number, y: number, dx: number, dy: number, length: number): OutlineSegment {
  return { length, pointAt: (distance) => ({ x: x + dx * distance, y: y + dy * distance, nx: dy, ny: -dx }) };
}

function corner(x: number, y: number, radius: number, startAngle: number): OutlineSegment {
  return { length: Math.PI * radius / 2, pointAt: (distance) => {
    const angle = startAngle + distance / radius;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    return { x: x + radius * nx, y: y + radius * ny, nx, ny };
  } };
}

export function getSpikyOutline(width: number, height: number): string {
  const config = STORY_PRESENTATION.spikyOutline;
  const { inset } = config;
  // ResizeObserver supplies the actual dimensions after the first render.
  if (width <= inset * 2 || height <= inset * 2) return '';
  const right = width - inset;
  const bottom = height - inset;
  const radius = Math.min(config.cornerRadius, (width - inset * 2) / 2, (height - inset * 2) / 2);
  const horizontal = width - inset * 2 - radius * 2;
  const vertical = height - inset * 2 - radius * 2;
  const segments = [
    straight(inset + radius, inset, 1, 0, horizontal),
    corner(right - radius, inset + radius, radius, -Math.PI / 2),
    straight(right, inset + radius, 0, 1, vertical),
    corner(right - radius, bottom - radius, radius, 0),
    straight(right - radius, bottom, -1, 0, horizontal),
    corner(inset + radius, bottom - radius, radius, Math.PI / 2),
    straight(inset, bottom - radius, 0, -1, vertical),
    corner(inset + radius, inset + radius, radius, Math.PI),
  ];
  const perimeter = segments.reduce((sum, segment) => sum + segment.length, 0);
  const spikes = Math.max(8, Math.round(perimeter / config.pitch));
  const pitch = perimeter / spikes;
  // Keep valleys well outside the corner centers so their bases cannot collapse.
  const depth = Math.min(config.depth, radius * config.maxDepthRatio, pitch * config.maxDepthRatio);
  const points: string[] = [];
  let segmentIndex = 0;
  let segmentStart = 0;
  for (let i = 0; i < spikes * 2; i++) {
    const distance = i * pitch / 2;
    while (segmentIndex < segments.length - 1 && distance >= segmentStart + segments[segmentIndex].length) {
      segmentStart += segments[segmentIndex].length;
      segmentIndex++;
    }
    const { x, y, nx, ny } = segments[segmentIndex].pointAt(distance - segmentStart);
    const offset = i % 2 === 0 ? 0 : depth;
    points.push(`${x - nx * offset},${y - ny * offset}`);
  }
  return points.join(' ');
}
