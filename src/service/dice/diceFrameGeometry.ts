import { DICE_FACE_PRESENTATION as face } from '../../configs/dicePresentationConfig';
import { HOVER_PRESENTATION as hover } from '../../configs/skillPresentationConfig';

/** Offset the visible rim's outer edge to the frame's outer border. */
export function getDiceFrameGeometry(size: number) {
  const radius = (face.rimRadius + face.rimStrokeWidth / 2) * size / face.viewBoxSize;
  const outset = hover.frameGap + hover.frameWidth;
  return { outset, radius: radius + outset, borderWidth: hover.frameWidth };
}
