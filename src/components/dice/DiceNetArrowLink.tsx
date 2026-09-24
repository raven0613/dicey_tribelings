import { useId } from 'react';
import { ARROW_CONFIG, ARROW_IDS } from '../../configs/directionalStickerConfig';
import { DICE_NET_PRESENTATION as presentation } from '../../configs/diceNetPresentationConfig';
import { getArrowTarget } from '../../service/dice/directionalFaces';
import { getDiceNet, type NetBounds } from '../../service/dice/diceNet';
import type { ArrowId } from '../../types/creatures';
import type { Dice } from '../../types/game';

interface DiceNetArrowLinkProps {
  dice: Dice;
  source: number;
  target: number;
  arrow: ArrowId;
  scale: number;
  invalid: boolean;
}

type Point = [number, number];
const distance = (a: Point, b: Point) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);

export function DiceNetArrowLink({ dice, source, target, arrow, scale, invalid }: DiceNetArrowLinkProps) {
  const markerId = useId();
  const net = getDiceNet(dice.dieType);
  const outgoing = ARROW_CONFIG[arrow].vector;
  const reverse = ARROW_IDS.find((id) => getArrowTarget(dice, target, id) === source)!;
  const incoming = ARROW_CONFIG[reverse].vector;
  const dock = (bounds: NetBounds, [x, y]: readonly number[]) => {
    const edge: Point = [(bounds.x + bounds.width / 2 * (1 + x)) * scale,
      (bounds.y + bounds.height / 2 * (1 + y)) * scale];
    const tip: Point = [edge[0] - x * presentation.arrowLinkInset, edge[1] - y * presentation.arrowLinkInset];
    const corners: Point[] = [-1, 1].map((sign) => [
      edge[0] + (x ? 0 : sign * bounds.width * scale / 2),
      edge[1] + (y ? 0 : sign * bounds.height * scale / 2),
    ]);
    return { edge, tip, corners };
  };
  const start = dock(net.faces[source].bounds, outgoing);
  const end = dock(net.faces[target].bounds, incoming);
  // Follow the square grid edges so a cut-edge connection never covers role text.
  const routes = start.corners.flatMap((a) => end.corners.map((b) => ({
    points: [a, [b[0], a[1]] as Point, b],
    length: distance(start.edge, a) + distance(a, b) + distance(b, end.edge),
  })));
  const shortest = routes.reduce((best, route) => route.length < best.length ? route : best);
  const points = distance(start.edge, end.edge) < 1e-7
    ? [start.tip, end.tip] : [start.tip, start.edge, ...shortest.points, end.edge, end.tip];
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.join(' ')}`).join(' ');

  return <svg className={`dice-net-arrow-link ${invalid ? 'is-invalid' : ''}`}
    width={net.width * scale} height={net.height * scale} aria-hidden="true">
    <defs>
      <marker id={markerId} markerWidth={presentation.arrowLinkMarkerSize} markerHeight={presentation.arrowLinkMarkerSize}
        refX="7" refY="4" viewBox="0 0 8 8" orient="auto" markerUnits="userSpaceOnUse">
        <path d="M 0 0 L 8 4 L 0 8 Z" fill="currentColor" />
      </marker>
    </defs>
    <path className="dice-net-arrow-link-shadow" d={path} />
    <path className="dice-net-arrow-link-line" d={path} markerEnd={`url(#${markerId})`} />
    <circle cx={start.tip[0]} cy={start.tip[1]} r="3" fill="currentColor" />
  </svg>;
}
