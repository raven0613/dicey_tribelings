import { useId } from 'react';
import { MATERIAL_SHEEN } from '../../configs/materials/materialConfig';
import { DICE_FACE_PRESENTATION as face } from '../../configs/dicePresentationConfig';
import type { FaceMaterial } from '../../types/materials';

export function MaterialSheen({ material }: { material?: FaceMaterial }) {
  const id = `material-sheen-${useId()}`;
  const sheen = material && MATERIAL_SHEEN[material];
  if (!sheen) return null;
  return <>
    <defs>
      <linearGradient id={id} gradientTransform={`rotate(${sheen.angle} .5 .5)`}>
        <stop offset="0" stopColor={sheen.color} stopOpacity="0" />
        <stop offset=".35" stopColor={sheen.color} stopOpacity="0" />
        <stop offset=".48" stopColor={sheen.color} />
        <stop offset=".58" stopColor={sheen.color} stopOpacity="0" />
        <stop offset="1" stopColor={sheen.color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <rect x={face.stickerInset} y={face.stickerInset} width={100 - face.stickerInset * 2}
      height={100 - face.stickerInset * 2} rx={face.stickerRadius} fill={`url(#${id})`} opacity={sheen.opacity} />
  </>;
}
