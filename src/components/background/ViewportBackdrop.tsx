import type { CSSProperties } from 'react';
import { BACKGROUND_PRESENTATION, BACKGROUND_SCENES } from '../../configs/backgrounds/backgroundConfig';
import { getBackgroundAssetUrl } from '../../service/background/backgroundAssets';
import './viewportBackdrop.scss';

export function ViewportBackdrop() {
  const scene = BACKGROUND_SCENES[BACKGROUND_PRESENTATION.scene];
  const { file, brightness, blur } = scene.fullBackground;
  return <div className="viewport-backdrop" aria-hidden="true" style={{
    backgroundColor: scene.color,
    backgroundImage: `url("${getBackgroundAssetUrl(scene.assetDirectory, file)}")`,
    '--backdrop-brightness': brightness,
    '--backdrop-blur': `${blur}px`,
  } as CSSProperties} />;
}
