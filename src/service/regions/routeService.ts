import type { MapNode } from '../../types/game';

export function completeRouteNode(nodes: MapNode[], id: number): MapNode[] {
  return nodes.map((node) => ({ ...node, current: false, completed: node.completed || node.id === id }));
}

export function selectRouteNode(nodes: MapNode[], choices: number[], id: number): MapNode[] | null {
  if (!choices.includes(id) || !nodes.some((node) => node.id === id && !node.completed && !node.skipped)) return null;
  return nodes.map((node) => ({ ...node, current: node.id === id,
    skipped: node.skipped || (choices.includes(node.id) && node.id !== id) }));
}

export function chapterPath(nodes: MapNode[], route: 'safe' | 'challenge'): MapNode[] {
  const path: MapNode[] = [];
  let node: MapNode | undefined = nodes[0];
  while (node) {
    path.push(node);
    const next: MapNode[] = nodes.filter((candidate) => node!.next.includes(candidate.id));
    node = next.find((candidate) => candidate.route === route) ?? next[0];
  }
  return path;
}
