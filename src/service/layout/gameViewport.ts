import { VIEWPORT_PRESENTATION as config } from '../../configs/viewportConfig';

export function getGameViewport(width: number, height: number, coarsePointer: boolean) {
  const mobile = coarsePointer && Math.min(width, height) <= config.mobileShortSide;
  const scale = mobile ? 1 : Math.min(width / config.referenceWidth, height / config.referenceHeight);
  return { scale, mobile, width: width / scale, height: height / scale,
    minimumFontSize: config.minimumFontSize / scale };
}

/** DOM measurements are screen CSS pixels; animations and portals use stage units. */
export function getGameRect(element: Element) {
  const stage = document.getElementById('game-stage')!;
  const bounds = stage.getBoundingClientRect();
  const scale = Number(stage.dataset.scale);
  const rect = element.getBoundingClientRect();
  return { x: (rect.left - bounds.left) / scale, y: (rect.top - bounds.top) / scale,
    left: (rect.left - bounds.left) / scale, top: (rect.top - bounds.top) / scale,
    right: (rect.right - bounds.left) / scale, bottom: (rect.bottom - bounds.top) / scale,
    width: rect.width / scale, height: rect.height / scale };
}
