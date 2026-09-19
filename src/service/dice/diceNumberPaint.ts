import { DICE_NUMBER_PRESENTATION as config } from '../../configs/dicePresentationConfig';
import { ALL_FACE_TAGS } from '../../configs/materials/materialConfig';
import type { CreatureTag } from '../../types/creatures';

function luminance(hex: string) {
  const rgb = [1, 3, 5].map((offset) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}

export function getNumberPaint(tags: readonly CreatureTag[]) {
  if (ALL_FACE_TAGS.every((tag) => tags.includes(tag))) {
    return { colors: [...config.rainbowColors], angle: config.rainbowAngle, hardSplit: false };
  }
  const colors = [...new Set(tags)].map((tag) => config.tagColors[tag])
    .sort((a, b) => luminance(b) - luminance(a) || a.localeCompare(b));
  return { colors, angle: config.splitAngle + 90, hardSplit: true };
}
